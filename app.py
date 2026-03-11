from fastapi.security import OAuth2PasswordRequestForm
import uvicorn
from fastapi import FastAPI, Request, HTTPException, UploadFile, File, Form, Depends, status
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv
import shutil
import time
from typing import List
import json
import logging

# --- Import all our new/updated modules ---
import google.generativeai as genai
import markdown
import models, schemas, auth  # Import our new auth and schemas files
from database import create_db_and_tables, SessionLocal
from sqlalchemy.orm import Session

# --- 1. Setup Logging ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- 2. Load Environment Variables ---
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    logger.error("FATAL: GEMINI_API_KEY not found in .env file")
    raise EnvironmentError("FATAL: GEMINI_API_KEY not found in .env file")

genai.configure(api_key=GEMINI_API_KEY)
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key={GEMINI_API_KEY}"

# Initialize the FastAPI app
app = FastAPI()

# --- 3. Create Database ---
create_db_and_tables()

# --- 4. Mount Static Files & Templates ---
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


# --- 5. API Endpoints ---

# === AUTHENTICATION ENDPOINTS ===
@app.post("/api/signup", response_model=schemas.UserInDB)
async def handle_signup(user: schemas.UserCreate, db: Session = Depends(auth.get_db)):
    logger.info(f"Signup attempt for username: {user.username}")
    db_user = auth.get_user(db, username=user.username)
    if db_user:
        logger.warning(f"Username {user.username} already registered.")
        raise HTTPException(status_code=400, detail="Username already registered")

    # Check for existing email
    db_user_email = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user_email:
        logger.warning(f"Email {user.email} already registered.")
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = auth.get_password_hash(user.password)
    # We use user.email here (which is an EmailStr)
    new_user = models.User(username=user.username, email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    logger.info(f"Successfully created user: {user.username}")
    return schemas.UserInDB.from_orm(new_user)


@app.post("/api/login", response_model=schemas.Token)
async def handle_login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(auth.get_db)):
    logger.info(f"Login attempt for username: {form_data.username}")
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        logger.warning(f"Failed login attempt for: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.username})
    logger.info(f"Successful login for: {form_data.username}")
    return {"access_token": access_token, "token_type": "bearer"}


# === USER DATA ENDPOINTS (PROTECTED) ===
@app.get("/api/users/me", response_model=schemas.UserInDB)
async def read_users_me(current_user: schemas.UserInDB = Depends(auth.get_current_user)):
    logger.info(f"Fetched user data for: {current_user.username}")
    return current_user


@app.post("/api/my-interests")
async def update_my_interests(
        interests_data: schemas.InterestsUpdate,
        db: Session = Depends(auth.get_db),
        current_user: schemas.UserInDB = Depends(auth.get_current_user)
):
    logger.info(f"Updating interests for user: {current_user.username}")
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.interests = json.dumps(interests_data.interests)
    db.commit()
    logger.info(f"Successfully updated interests for user: {current_user.username}")
    return {"message": "Interests updated successfully"}


# --- NEW: Endpoint to update user email ---
@app.post("/api/users/me/update-email", response_model=schemas.UserInDB)
async def update_email(
        email_data: schemas.EmailUpdate,
        db: Session = Depends(auth.get_db),
        current_user: schemas.UserInDB = Depends(auth.get_current_user)
):
    logger.info(f"Email update attempt for user: {current_user.username}")

    # Find the user in the DB
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        logger.error(f"Logged in user (ID: {current_user.id}) not found in DB.")
        raise HTTPException(status_code=404, detail="User not found")

    # Check if the new email is already taken by *another* user
    if email_data.new_email != user.email:
        existing_user = db.query(models.User).filter(models.User.email == email_data.new_email).first()
        if existing_user:
            logger.warning(f"Email {email_data.new_email} is already taken.")
            raise HTTPException(status_code=400, detail="This email is already registered to another account.")

    # Update email and save
    user.email = email_data.new_email
    db.commit()
    db.refresh(user)
    logger.info(f"Successfully updated email for user: {current_user.username}")
    return schemas.UserInDB.from_orm(user)


# === GENERATIVE AI ENDPOINTS (PROTECTED) ===
@app.post("/api/chat")
async def handle_chat(chat_request: schemas.ChatRequest):
    # (This endpoint remains public)
    logger.info("Public chat API called")
    try:
        # ... (same as before) ...
        payload = {
            "contents": [{"parts": [{"text": chat_request.userQuery}]}],
            "systemInstruction": {
                "parts": [{"text": chat_request.systemPrompt}]
            },
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(
                GEMINI_API_URL,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        logger.error(f"Chat HTTP error: {e}")
        raise HTTPException(status_code=e.response.status_code, detail=f"Gemini API error: {e.response.text}")
    except Exception as e:
        logger.error(f"Chat internal error: {e}")
        raise HTTPException(status_code=500, detail=f"An internal server error occurred: {str(e)}")


@app.post("/api/summarize")
async def handle_summarize(
        db: Session = Depends(auth.get_db),
        current_user: schemas.UserInDB = Depends(auth.get_current_user),
        file: UploadFile = File(...),
        prompt: str = Form(...)
):
    # (This endpoint is protected and saves to DB)
    logger.info(f"Summarize request for user: {current_user.username}, file: {file.filename}")
    temp_dir = "temp_uploads";
    os.makedirs(temp_dir, exist_ok=True)
    temp_file_path = os.path.join(temp_dir, file.filename)
    uploaded_file = None

    try:
        # ... (same as before) ...
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        uploaded_file = genai.upload_file(path=temp_file_path)
        while uploaded_file.state.name == "PROCESSING":
            time.sleep(10)
            uploaded_file = genai.get_file(uploaded_file.name)
        if uploaded_file.state.name == "FAILED":
            raise HTTPException(status_code=500, detail="Google File API processing failed.")

        model = genai.GenerativeModel('gemini-2.5-flash-preview-09-2025')
        response = model.generate_content(
            [prompt, uploaded_file],
            generation_config=genai.types.GenerationConfig(response_mime_type="application/json")
        )

        # Save to database
        new_summary = models.SummarizedFile(
            original_filename=file.filename,
            json_content=response.text,
            owner_id=current_user.id
        )
        db.add(new_summary)
        db.commit()
        logger.info(f"Summary saved to DB for user: {current_user.username}")
        return response.text
    except Exception as e:
        logger.error(f"An error occurred during summarization: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if uploaded_file:
            try:
                genai.delete_file(uploaded_file.name)
            except Exception:
                pass
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)


@app.post("/api/create_book")
async def handle_create_book(
        book_request: schemas.BookRequest,
        db: Session = Depends(auth.get_db),
        current_user: schemas.UserInDB = Depends(auth.get_current_user)
):
    # (This endpoint is protected and saves to DB)
    logger.info(f"Book generation request received for user: {current_user.username}")
    try:
        # ... (same as before) ...
        interests_string = ", ".join(book_request.userInterests)
        final_prompt = book_request.systemPrompt.format(
            userPrompt=book_request.userPrompt,
            userInterests=interests_string
        )
        model = genai.GenerativeModel('gemini-2.5-flash-preview-09-2025')
        response = model.generate_content(final_prompt)
        html_content = markdown.markdown(response.text, extensions=['fenced_code', 'tables'])

        # Save to database
        title = "Untitled Book"
        try:
            title = html_content.split("<h1>")[1].split("</h1>")[0]
        except IndexError:
            logger.warning("Could not parse H1 title from generated book.")

        new_book = models.GeneratedBook(
            title=title,
            html_content=html_content,
            owner_id=current_user.id
        )
        db.add(new_book)
        db.commit()
        logger.info(f"Book saved to DB for user: {current_user.username}")

        return {"htmlContent": html_content}
    except Exception as e:
        logger.error(f"An error occurred during book creation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- 6. Page Routes (GET Requests) ---
# (All your @app.get routes are the same)
@app.get("/", name="index")
async def get_main_page(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/books", name="books")
async def get_books_page(request: Request):
    return templates.TemplateResponse("books.html", {"request": request})


@app.get("/quizzes", name="quizzes")
async def get_quizzes_page(request: Request):
    return templates.TemplateResponse("quizzes.html", {"request": request})


@app.get("/services", name="services")
async def get_services_page(request: Request):
    return templates.TemplateResponse("services.html", {"request": request})


@app.get("/coaching", name="coaching")
async def get_coaching_page(request: Request):
    return templates.TemplateResponse("coaching.html", {"request": request})


@app.get("/account", name="account")
async def get_account_page(request: Request):
    return templates.TemplateResponse("account.html", {"request": request})


@app.get("/settings", name="settings")
async def get_settings_page(request: Request):
    return templates.TemplateResponse("settings.html", {"request": request})


@app.get("/purchase-history", name="purchase_history")
async def get_purchase_history_page(request: Request):
    return templates.TemplateResponse("purchase.html", {"request": request})


@app.get("/signup", name="signup")
async def get_signup_page(request: Request):
    return templates.TemplateResponse("signup.html", {"request": request})


@app.get("/login", name="login")
async def get_login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})


# --- 7. Run the App ---
if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)