// Wait for the DOM to be fully loaded before running scripts
document.addEventListener('DOMContentLoaded', () => {

    // --- UPDATED: PDF SLIDER LOGIC ---
    const pdfSliderOverlay = document.getElementById('pdfSliderOverlay');
    const closePdfSliderBtn = document.getElementById('closePdfSliderBtn');
    const pdfSliderContainer = document.getElementById('pdfSliderContainer');
    const pageCounter = document.getElementById('pageCounter');

    // Select all buttons that are meant to read books
    const readBookBtns = document.querySelectorAll('.read-book-btn');

    if (pdfSliderOverlay && readBookBtns.length > 0) {

        // Function to render the PDF from a URL
        const openPdfViewer = async (url) => {
            // Show modal and loader
            pdfSliderOverlay.classList.add('visible');
            pdfSliderContainer.innerHTML = '<div class="spinner"></div>';
            pageCounter.innerText = "Loading...";

            try {
                // Load PDF document from the URL
                const loadingTask = pdfjsLib.getDocument(url);
                const pdf = await loadingTask.promise;

                pdfSliderContainer.innerHTML = ''; // Clear spinner

                // Loop through all pages and render them
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);

                    // Create slide container
                    const slideDiv = document.createElement('div');
                    slideDiv.classList.add('pdf-slide');

                    // Create canvas
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');

                    // CSS handles the visual size, but we need high res for the canvas
                    // Scale 1.5 provides good clarity without being too heavy
                    const viewport = page.getViewport({ scale: 1.5 });

                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    // Render page
                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport
                    };

                    await page.render(renderContext).promise;

                    slideDiv.appendChild(canvas);
                    pdfSliderContainer.appendChild(slideDiv);
                }

                // Initial counter update
                pageCounter.textContent = `Page 1 of ${pdf.numPages}`;

                // Update page counter on scroll
                pdfSliderContainer.addEventListener('scroll', () => {
                    // Calculate which slide is in the center of the view
                    const center = pdfSliderContainer.scrollLeft + (pdfSliderContainer.offsetWidth / 2);
                    const slides = document.querySelectorAll('.pdf-slide');

                    slides.forEach((slide, index) => {
                        const slideLeft = slide.offsetLeft;
                        const slideRight = slideLeft + slide.offsetWidth;

                        if (slideLeft <= center && slideRight > center) {
                            pageCounter.textContent = `Page ${index + 1} of ${pdf.numPages}`;
                        }
                    });
                });

            } catch (error) {
                console.error("Error rendering PDF:", error);
                showNotification("Could not load book. " + error.message);
                pdfSliderOverlay.classList.remove('visible');
            }
        };

        // Attach Click Event to all "Start Reading" buttons
        readBookBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Prevent default anchor behavior if it's inside an <a> tag
                e.preventDefault();
                e.stopPropagation();

                const pdfUrl = btn.getAttribute('data-src');
                if (pdfUrl) {
                    openPdfViewer(pdfUrl);
                } else {
                    showNotification("Book source not found.");
                }
            });
        });

        // Close Logic
        const closeSlider = () => {
            pdfSliderOverlay.classList.remove('visible');
            // Slight delay to clear memory after transition
            setTimeout(() => {
                pdfSliderContainer.innerHTML = '';
            }, 300);
        };

        if(closePdfSliderBtn) closePdfSliderBtn.addEventListener('click', closeSlider);

        pdfSliderOverlay.addEventListener('click', (e) => {
            if (e.target === pdfSliderOverlay) closeSlider();
        });
    }
    // --- RESPONSIVE PDF SLIDER LOGIC (400px Height) ---
    const productCards = document.querySelectorAll('.product-card[data-pdf-url]');

    if (productCards.length > 0) {

        // Helper: Render a single page to a canvas
        const renderThumbnail = async (pdfDoc, pageNum, container) => {
            try {
                const page = await pdfDoc.getPage(pageNum);

                const canvas = document.createElement('canvas');
                canvas.className = 'mini-page-canvas';
                const ctx = canvas.getContext('2d');

                // SCALE CALCULATION:
                // We want the image to be exactly 400px high to match CSS
                const unscaledViewport = page.getViewport({ scale: 1 });
                const scaleFactor = 400 / unscaledViewport.height;

                const viewport = page.getViewport({ scale: scaleFactor });

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: ctx,
                    viewport: viewport
                };

                await page.render(renderContext).promise;
                container.appendChild(canvas);

                // Click listener: Clicking a slide opens the full reader
                canvas.addEventListener('click', () => {
                     const mainBtn = container.parentElement.querySelector('.read-book-btn');
                     if(mainBtn) mainBtn.click();
                });

            } catch (err) {
                console.error(`Error rendering page ${pageNum}`, err);
            }
        };

        // Process each card found in the grid
        productCards.forEach(async (card) => {
            const url = card.getAttribute('data-pdf-url');
            const sliderContainer = card.querySelector('.pdf-mini-slider');
            if (!url || !sliderContainer) return;

            try {
                // Load the PDF
                const pdf = await pdfjsLib.getDocument(url).promise;

                // Clear the loading spinner
                sliderContainer.innerHTML = '';

                // Render first 5 pages for preview
                const pagesToRender = Math.min(pdf.numPages, 5);

                for (let i = 1; i <= pagesToRender; i++) {
                    await renderThumbnail(pdf, i, sliderContainer);
                }

            } catch (error) {
                console.error("Slider generation failed:", error);
                sliderContainer.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <p style="color: #ff4c4c;">Preview Unavailable</p>
                        <p style="font-size: 0.8rem; color: #888;">${error.message}</p>
                    </div>
                `;
            }
        });
    }

    // --- Lucide Icons ---
    try {
        lucide.createIcons();
    } catch (e) {
        console.error("Lucide icons failed to create. Ensure the script is loaded.", e);
    }

    // --- Mobile Menu Toggle ---
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    if (menuToggle && navLinks) {
        const iconMenu = menuToggle.querySelector('.icon-menu');
        const iconClose = menuToggle.querySelector('.icon-close');
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const isActive = navLinks.classList.contains('active');
            if (iconMenu && iconClose) {
                iconMenu.style.display = isActive ? 'none' : 'block';
                iconClose.style.display = isActive ? 'block' : 'none';
            }
        });
        // Click-outside-to-close logic
        document.addEventListener('click', (e) => {
            if (navLinks && menuToggle && !navLinks.contains(e.target) && !menuToggle.contains(e.target) && navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                if (iconMenu && iconClose) {
                    iconMenu.style.display = 'block';
                    iconClose.style.display = 'none';
                }
            }
        });
    }

    // --- Account Dropdown Toggle (ON-CLICK) ---
    const accountMenuToggle = document.getElementById('accountMenuToggle');
    const accountMenu = document.getElementById('accountMenu');
    if (accountMenuToggle && accountMenu) {
        accountMenuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            accountMenu.classList.toggle('visible');
        });
        document.addEventListener('click', (e) => {
            if (accountMenu && !accountMenu.contains(e.target) && !accountMenuToggle.contains(e.target) && accountMenu.classList.contains('visible')) {
                accountMenu.classList.remove('visible');
            }
        });
    }

    // --- Animate Sections on Scroll ---
    const sections = document.querySelectorAll('.products-section');
    if (sections.length > 0) {
        const sectionObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { root: null, threshold: 0.1 });
        sections.forEach(section => sectionObserver.observe(section));
    }

    // --- Stats Counter Animation ---
    const statsContainer = document.getElementById('stats');
    if (statsContainer) {
        const statNumbers = document.querySelectorAll('.stat-number');
        const statsObserver = new IntersectionObserver((entries, observer) => {
            const [entry] = entries;
            if (!entry.isIntersecting) return;
            statNumbers.forEach(stat => {
                const target = +stat.getAttribute('data-target');
                let current = 0;
                const increment = Math.max(Math.floor(target / 100), 1);
                const updateCount = () => {
                    current += increment;
                    if (current < target) {
                        stat.innerText = Math.ceil(current).toLocaleString();
                        requestAnimationFrame(updateCount);
                    } else {
                        stat.innerText = target.toLocaleString();
                    }
                };
                updateCount();
            });
            observer.unobserve(statsContainer);
        }, { threshold: 0.5 });
        statsObserver.observe(statsContainer);
    }

    // --- CTA Button Interactivity ---
    const exploreBtn = document.getElementById('exploreBtn');
    const getStartedBtn = document.getElementById('getStartedBtn');
    if (exploreBtn) {
        exploreBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/books';
        });
    }
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', () => {
            showNotification('Welcome to Navimind! Explore our products below.');
        });
    }

    // --- AI Chat Modal Logic ---
    const chatOverlay = document.getElementById('chatModalOverlay');
    const openChatModalBtn = document.getElementById('openChatModal');
    const closeChatModalBtn = document.getElementById('closeChatModal');
    const chatSendBtn = document.getElementById('chatSendBtn');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatBody');
    const chatLoading = document.getElementById('chatLoading');

    const openChat = () => {
        if (chatOverlay) chatOverlay.classList.add('visible');
        if (chatInput) chatInput.focus();
    };

    const closeChat = () => {
        if (chatOverlay) chatOverlay.classList.remove('visible');
    };

    const addMessageToChat = (text, sender) => {
        if (!chatMessages) return;
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', sender);
        const avatar = document.createElement('span');
        avatar.classList.add('chat-avatar');
        avatar.innerHTML = `<i data-lucide="${sender === 'user' ? 'user' : 'brain-circuit'}"></i>`;
        const messageText = document.createElement('p');
        messageText.innerText = text;
        messageElement.appendChild(avatar);
        messageElement.appendChild(messageText);
        chatMessages.appendChild(messageElement);
        lucide.createIcons();
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const handleSendMessage = async () => {
        if (!chatInput) return;
        const userMessage = chatInput.value.trim();
        if (userMessage === '') return;

        addMessageToChat(userMessage, 'user');
        chatInput.value = '';
        if (chatLoading) chatLoading.style.display = 'flex';
        if (chatSendBtn) chatSendBtn.disabled = true;

        try {
            const botMessage = await callChatApi(userMessage, PROMPTS.CHATBOT_SYSTEM_PROMPT);
            addMessageToChat(botMessage, 'bot');
        } catch (error) {
            console.error("Chat error:", error);
            addMessageToChat(`I'm sorry, I seem to be having trouble connecting. Error: ${error.message}`, 'bot');
        } finally {
            if (chatLoading) chatLoading.style.display = 'none';
            if (chatSendBtn) chatSendBtn.disabled = false;
            if (chatInput) chatInput.focus();
        }
    };

    // This function is for TEXT-ONLY chat.
    const callChatApi = async (userQuery, systemPrompt) => {
        const payload = {
            userQuery: userQuery,
            systemPrompt: systemPrompt
        };

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json();
                console.error("Server API Error Response:", err);
                throw new Error(err.detail || `Server error: ${response.status}`);
            }

            const result = await response.json();

            const candidate = result.candidates?.[0];
            if (candidate && candidate.content?.parts?.[0]?.text) {
                return candidate.content.parts[0].text;
            } else {
                console.warn("Invalid response structure from server:", result);
                if(candidate && candidate.finishReason) {
                    return `I couldn't generate a response. Reason: ${candidate.finishReason}`;
                }
                throw new Error("Invalid response structure received from server.");
            }
        } catch (error) {
            console.error("Fetch/Network error calling /api/chat:", error);
            throw error;
        }
    };

    // --- FUNCTION FOR FILE SUMMARIZATION (UPDATED WITH AUTH) ---
    const callSummarizeApi = async (fileObject) => {
        const formData = new FormData();
        formData.append('file', fileObject);
        formData.append('prompt', PROMPTS.BOOK_ANALYSIS_PROMPT);

        const token = localStorage.getItem('token');
        if (!token) {
            showNotification("You must be logged in to summarize a file.");
            return Promise.reject(new Error("Not authenticated")); // Use Promise.reject
        }

        try {
            const response = await fetch('/api/summarize', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (response.status === 401) {
                showNotification("Your session expired. Please log in again.");
                handleLogout();
                throw new Error("Not authenticated");
            }
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || `Server error: ${response.status}`);
            }
            const resultText = await response.text();
            return resultText;

        } catch (error) {
            console.error("Fetch/Network error calling /api/summarize:", error);
            throw error;
        }
    };

    // --- FUNCTION FOR BOOK CREATION (UPDATED WITH AUTH) ---
    const callCreateBookApi = async (userPrompt, userInterests) => {
        const payload = {
            userPrompt: userPrompt,
            userInterests: userInterests,
            systemPrompt: PROMPTS.BOOK_GENERATION_PROMPT
        };

        const token = localStorage.getItem('token');
        if (!token) {
            showNotification("You must be logged in to create a book.");
            return Promise.reject(new Error("Not authenticated")); // Use Promise.reject
        }

        try {
            const response = await fetch('/api/create_book', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.status === 401) {
                showNotification("Your session expired. Please log in again.");
                handleLogout();
                throw new Error("Not authenticated");
            }
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || `Server error: ${response.status}`);
            }
            const result = await response.json();
            return result.htmlContent;

        } catch (error) {
            console.error("Fetch/Network error calling /api/create_book:", error);
            throw error;
        }
    };


    // --- AI BOOK SUMMARIZER LOGIC (Uncommented) ---
    const bookUploader = document.getElementById('bookUploader');
    const summarizeButton = document.getElementById('summarizeButton');
    const summaryOutput = document.getElementById('summaryOutput');

    if (summarizeButton && bookUploader && summaryOutput) {
        summarizeButton.addEventListener('click', async () => {
            const file = bookUploader.files[0];
            if (!file) {
                showNotification("Please select a file first.");
                return;
            }

            // Check for login *before* doing anything
            const token = localStorage.getItem('token');
            if (!token) {
                 showNotification("Please sign in to analyze a file.");
                return;
            }

            summarizeButton.disabled = true;
            summaryOutput.style.display = "block";
            summaryOutput.style.color = "var(--color-accent-blue)";
            summaryOutput.textContent = "Uploading and analyzing book... This may take a minute or two for large files. Please wait.";

            try {
                const analysisJsonString = await callSummarizeApi(file);
                const analysisData = JSON.parse(analysisJsonString);
                summaryOutput.style.color = "var(--color-text-primary)";
                summaryOutput.textContent = JSON.stringify(analysisData, null, 2);
                showNotification("Summary complete and saved to your account!");
            } catch (error) {
                console.error("Summarization failed:", error);
                if (error.message !== "Not authenticated") { // Don't show generic error if already logged out
                    summaryOutput.style.color = "#ff4c4c";
                    summaryOutput.textContent = `An error occurred: ${error.message}`;
                } else {
                    summaryOutput.style.display = "none"; // Hide the box if auth failed
                }
            } finally {
                summarizeButton.disabled = false;
            }
        });
    }

    // --- BOOK CREATION MODAL LOGIC ---
    const openCreateBookModalBtn = document.getElementById('openCreateBookModalBtn');
    const createBookModalOverlay = document.getElementById('createBookModalOverlay');
    const closeCreateBookModalBtn = document.getElementById('closeCreateBookModalBtn');
    const generateBookBtn = document.getElementById('generateBookBtn');
    const bookPromptInput = document.getElementById('bookPromptInput');
    const loaderOverlay = document.getElementById('loaderOverlay');
    const bookResultModalOverlay = document.getElementById('bookResultModalOverlay');
    const bookResultBody = document.getElementById('bookResultBody');
    const closeBookResultModalBtn = document.getElementById('closeBookResultModalBtn');
    const doneBookResultModalBtn = document.getElementById('doneBookResultModalBtn');

    if (openCreateBookModalBtn && createBookModalOverlay) {
        openCreateBookModalBtn.addEventListener('click', () => {
            // Check for login *before* opening the modal
            const token = localStorage.getItem('token');
            if (!token) {
                showNotification("Please sign in to create a book.");
                return;
            }
            createBookModalOverlay.classList.add('visible');
            if (bookPromptInput) bookPromptInput.focus();
        });

        const closeCreateModal = () => {
            if (createBookModalOverlay) createBookModalOverlay.classList.remove('visible');
        }
        if (closeCreateBookModalBtn) closeCreateBookModalBtn.addEventListener('click', closeCreateModal);

        if (createBookModalOverlay) createBookModalOverlay.addEventListener('click', (e) => {
            if (e.target === createBookModalOverlay) {
                closeCreateModal();
            }
        });

        if (generateBookBtn) generateBookBtn.addEventListener('click', async () => {
            const userPrompt = bookPromptInput.value.trim();
            if (userPrompt === "") {
                showNotification("Please enter a prompt for your book.");
                return;
            }

            const userInterests = getSelectedInterests();

            closeCreateModal();
            if (loaderOverlay) loaderOverlay.classList.add('visible');
            generateBookBtn.disabled = true;

            try {
                const bookHtmlContent = await callCreateBookApi(userPrompt, userInterests);
                if (bookResultBody) bookResultBody.innerHTML = bookHtmlContent;
                if (bookResultModalOverlay) bookResultModalOverlay.classList.add('visible');
                showNotification("Your new book has been created and saved!");
            } catch (error) {
                console.error("Book generation failed:", error);
                if (error.message !== "Not authenticated") {
                    showNotification(`Book generation failed: ${error.message}`);
                }
            } finally {
                if (loaderOverlay) loaderOverlay.classList.remove('visible');
                generateBookBtn.disabled = false;
                if (bookPromptInput) bookPromptInput.value = "";
            }
        });

        const closeResultModal = () => {
            if (bookResultModalOverlay) bookResultModalOverlay.classList.remove('visible');
        }
        if (closeBookResultModalBtn) closeBookResultModalBtn.addEventListener('click', closeResultModal);
        if (doneBookResultModalBtn) doneBookResultModalBtn.addEventListener('click', closeResultModal);

        if (bookResultModalOverlay) bookResultModalOverlay.addEventListener('click', (e) => {
            if (e.target === bookResultModalOverlay) {
                closeResultModal();
            }
        });
    }


    // --- Chat Event Listeners ---
    if (openChatModalBtn) openChatModalBtn.addEventListener('click', openChat);
    if (closeChatModalBtn) closeChatModalBtn.addEventListener('click', closeChat);
    if (chatOverlay) chatOverlay.addEventListener('click', (e) => { if (e.target === chatOverlay) closeChat(); });
    if (chatSendBtn) chatSendBtn.addEventListener('click', handleSendMessage);
    if (chatInput) chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleSendMessage(); } });

    // --- Notification Function ---
    function showNotification(message) {
        const existingNotif = document.querySelector('.notification');
        if (existingNotif) existingNotif.remove();
        const notification = document.createElement('div');
        notification.classList.add('notification');
        notification.innerText = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }

    // --- MY INTERESTS LOGIC (UPDATED FOR AUTH) ---
    const manageInterestsBtn = document.getElementById('manageInterestsBtn');
    const STORAGE_KEY_SELECTED = 'userSelectedInterests';
    const STORAGE_KEY_CUSTOM = 'userCustomInterests';

    let globalUserInterests = ["Artificial Intelligence", "JavaScript"];

    function getSelectedInterests() {
        return [...globalUserInterests];
    }

    async function saveSelectedInterests(interests) {
        const uniqueInterests = [...new Set(interests)];
        localStorage.setItem(STORAGE_KEY_SELECTED, JSON.stringify(uniqueInterests));
        globalUserInterests = uniqueInterests;

        const token = localStorage.getItem('token');
        if (token) {
            try {
                const response = await fetch('/api/my-interests', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ interests: globalUserInterests })
                });
                if (!response.ok) {
                    console.error("Failed to sync interests to DB");
                } else {
                    console.log("Interests successfully synced to DB");
                }
            } catch (error) {
                console.error("Error syncing interests:", error);
            }
        }
    }

    // This logic only runs if the 'Manage' button or card exists
    if (manageInterestsBtn) {
        const ALL_INTERESTS = [
            "Artificial Intelligence", "JavaScript", "UI/UX Design", "Psychology",
            "Career Growth", "Machine Learning", "Productivity", "Finance",
            "Web Development", "Data Science", "Marketing", "Philosophy",
            "Money", "Investment", "Relationships", "Self-Improvement", "Mindfulness"
        ];
        const interestsModalOverlay = document.getElementById('interestsModalOverlay');
        const closeInterestsModalBtn = document.getElementById('closeInterestsModalBtn');
        const doneInterestsModalBtn = document.getElementById('doneInterestsModalBtn');
        const interestsDisplayArea = document.getElementById('interestsDisplayArea');
        const interestSelectionList = document.getElementById('interestSelectionList');
        const customInterestInput = document.getElementById('customInterestInput');
        const addCustomInterestBtn = document.getElementById('addCustomInterestBtn');

        function getCustomInterests() {
            const stored = localStorage.getItem(STORAGE_KEY_CUSTOM);
            return stored ? JSON.parse(stored) : [];
        }
        function saveCustomInterests(interests) {
            localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify([...new Set(interests)]));
        }

        function renderAccountInterests() {
            if (!interestsDisplayArea) return;
            const interests = getSelectedInterests();
            interestsDisplayArea.innerHTML = '';

            if (interests.length === 0) {
                interestsDisplayArea.innerHTML = '<p style="color: var(--color-text-muted); font-style: italic;">No interests selected.</p>';
                return;
            }

            interests.forEach(interest => {
                const pill = document.createElement('span');
                pill.classList.add('interest-pill');
                pill.textContent = interest;
                interestsDisplayArea.appendChild(pill);
            });
        }

        function renderModalInterests() {
            const selectedInterests = getSelectedInterests();
            const customInterests = getCustomInterests();
            if (!interestSelectionList) return;
            interestSelectionList.innerHTML = '';
            const allDisplayableInterests = [...new Set([...ALL_INTERESTS, ...customInterests])];
            allDisplayableInterests.sort();

            allDisplayableInterests.forEach(interest => {
                const item = document.createElement('div');
                item.classList.add('interest-item');
                item.textContent = interest;
                item.setAttribute('data-interest', interest);
                if (selectedInterests.includes(interest)) {
                    item.classList.add('selected');
                }
                if (!ALL_INTERESTS.includes(interest)) {
                    const removeBtn = document.createElement('button');
                    removeBtn.classList.add('remove-interest-btn');
                    removeBtn.innerHTML = '<i data-lucide="x"></i>';
                    removeBtn.setAttribute('aria-label', `Remove ${interest}`);
                    item.appendChild(removeBtn);
                }
                interestSelectionList.appendChild(item);
            });
            lucide.createIcons();
        }

        function openInterestsModal(e) {
            e.preventDefault(); // Stop the <a> tag from following '#'
            if (e) e.stopPropagation(); // Stop card click from triggering

            // Check for login *before* opening modal
            const token = localStorage.getItem('token');
            if (!token) {
                 showNotification("Please sign in to manage your interests.");
                return;
            }

            if (!interestsModalOverlay) return;
            renderModalInterests();
            interestsModalOverlay.classList.add('visible');
        }

        function closeInterestsModal() {
            if (!interestsModalOverlay) return;
            interestsModalOverlay.classList.remove('visible');
            renderAccountInterests();
        }

        function handleModalListClick(e) {
            const target = e.target;
            if (target.closest('.remove-interest-btn')) {
                e.stopPropagation();
                const item = target.closest('.interest-item');
                const interest = item.getAttribute('data-interest');
                let selected = getSelectedInterests();
                let custom = getCustomInterests();
                selected = selected.filter(i => i !== interest);
                custom = custom.filter(i => i !== interest);
                saveSelectedInterests(selected); // Syncs to DB
                saveCustomInterests(custom);
                renderModalInterests();
                return;
            }
            if (target.closest('.interest-item')) {
                const item = target.closest('.interest-item');
                const interest = item.getAttribute('data-interest');
                let selected = getSelectedInterests();
                if (selected.includes(interest)) {
                    selected = selected.filter(i => i !== interest);
                    item.classList.remove('selected');
                } else {
                    selected.push(interest);
                    item.classList.add('selected');
                }
                saveSelectedInterests(selected); // Syncs to DB
            }
        }

        function addCustomInterest() {
            if (!customInterestInput) return;
            const newValue = customInterestInput.value.trim()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
            if (newValue === '') return;
            let selected = getSelectedInterests();
            let custom = getCustomInterests();
            const exists = custom.some(i => i.toLowerCase() === newValue.toLowerCase()) ||
                           ALL_INTERESTS.some(i => i.toLowerCase() === newValue.toLowerCase());
            if (!exists) {
                custom.push(newValue);
                selected.push(newValue);
                saveCustomInterests(custom);
                saveSelectedInterests(selected); // Syncs to DB
                renderModalInterests();
            }
            customInterestInput.value = '';
            customInterestInput.focus();
            const btnText = addCustomInterestBtn.querySelector('span');
            if (btnText) {
                btnText.textContent = 'Added!';
                addCustomInterestBtn.disabled = true;
                setTimeout(() => {
                    btnText.textContent = 'Add';
                    addCustomInterestBtn.disabled = false;
                }, 1500);
            }
        }

        // This now works for both the <a> on account.html and <button> on books.html
        manageInterestsBtn.addEventListener('click', openInterestsModal);

        if (interestsModalOverlay) {
            interestsModalOverlay.addEventListener('click', (e) => {
                if (e.target === interestsModalOverlay) {
                    closeInterestsModal();
                }
            });
        }
        if (closeInterestsModalBtn) closeInterestsModalBtn.addEventListener('click', closeInterestsModal);
        if (doneInterestsModalBtn) doneInterestsModalBtn.addEventListener('click', closeInterestsModal);
        if (interestSelectionList) interestSelectionList.addEventListener('click', handleModalListClick);
        if (addCustomInterestBtn) addCustomInterestBtn.addEventListener('click', addCustomInterest);
        if (customInterestInput) customInterestInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); addCustomInterest(); }
        });

        // Initial Load is handled by checkLoginStatus
    }

    // --- NEW: AUTHENTICATION SCRIPTING ---
    const desktopAuthButtons = document.getElementById('desktopAuthButtons');
    const mobileSignupNav = document.getElementById('mobileSignupNav');
    const mobileLoginNav = document.getElementById('mobileLoginNav');
    const accountMenuDropdown = document.getElementById('accountMenuDropdown');
    const logoutButton = document.getElementById('logoutButton');

    function showLoggedInUI() {
        if (desktopAuthButtons) desktopAuthButtons.classList.add('hidden');
        if (mobileSignupNav) mobileSignupNav.classList.add('hidden');
        if (mobileLoginNav) mobileLoginNav.classList.add('hidden');
        if (accountMenuDropdown) accountMenuDropdown.style.display = 'block';
    }

    function showLoggedOutUI() {
        if (desktopAuthButtons) desktopAuthButtons.classList.remove('hidden');
        if (mobileSignupNav) mobileSignupNav.classList.remove('hidden');
        if (mobileLoginNav) mobileLoginNav.classList.remove('hidden');
        if (accountMenuDropdown) accountMenuDropdown.style.display = 'none';
    }

    function handleLogout() {
        localStorage.removeItem('token');
        localStorage.removeItem('userSelectedInterests');
        showLoggedOutUI();
        // Reload if we're on an auth-only page like 'account'
        const authPages = ['/account', '/settings', '/purchase-history'];
        if (authPages.includes(window.location.pathname)) {
             window.location.href = '/';
        }
    }
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }

    // --- Check Login Status on Page Load ---
    async function checkLoginStatus() {
        // Set active nav links
        try {
            let currentPath = window.location.pathname;
            let pageKey = 'index';
            if (currentPath.length > 1) { // Not just "/"
                pageKey = currentPath.split('/')[1].split('.')[0];
            }
            const activeLinks = document.querySelectorAll(`.nav-link[data-page="${pageKey}"], .btn[data-page="${pageKey}"]`);
            activeLinks.forEach(link => link.classList.add('active'));
            if (['account', 'settings', 'purchase_history'].includes(pageKey)) {
                const accountIcon = document.querySelector('.nav-item-dropdown .nav-icon');
                if(accountIcon) accountIcon.classList.add('active');
            }
        } catch (e) {
            console.error("Could not set active nav link:", e);
        }

        // Check auth token
        const token = localStorage.getItem('token');
        if (!token) {
            showLoggedOutUI();
            globalUserInterests = JSON.parse(localStorage.getItem(STORAGE_KEY_SELECTED)) || ["Artificial Intelligence", "JavaScript"];
            // If we're on the books page, render interests from localStorage
            if (document.getElementById('interestsDisplayArea') && !document.getElementById('profileUsername')) {
                renderAccountInterests();
            }
            return;
        }

        try {
            const response = await fetch('/api/users/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const user = await response.json();
                showLoggedInUI();

                if (user.interests) {
                    globalUserInterests = JSON.parse(user.interests);
                } else {
                    globalUserInterests = JSON.parse(localStorage.getItem(STORAGE_KEY_SELECTED)) || ["Artificial Intelligence", "JavaScript"];
                    saveSelectedInterests(globalUserInterests); // Sync to DB
                }

                // If we are on the account page, populate the fields
                const profileUsername = document.getElementById('profileUsername');
                if (profileUsername) {
                    loadUserProfile(user);
                }
                // If we're on the books page, render interests
                if (document.getElementById('interestsDisplayArea') && !profileUsername) {
                    renderAccountInterests();
                }

            } else {
                handleLogout();
            }
        } catch (error) {
            console.error("Error checking login status:", error);
            handleLogout();
        }
    }

    // --- Signup Form ---
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password !== confirmPassword) {
                showNotification("Passwords do not match.");
                return;
            }

            try {
                const response = await fetch('/api/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, username, password })
                });

                if (response.ok) {
                    showNotification("Account created successfully! Please log in.");
                    window.location.href = '/login'; // Redirect to login
                } else {
                    const err = await response.json();
                    showNotification(`Signup failed: ${err.detail}`);
                }
            } catch (error) {
                showNotification(`An error occurred: ${error.message}`);
            }
        });
    }

    // --- Login Form ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData();
            formData.append('username', document.getElementById('username').value);
            formData.append('password', document.getElementById('password').value);

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem('token', data.access_token);
                    window.location.href = '/'; // Redirect to main page
                } else {
                    const err = await response.json();
                    showNotification(`Login failed: ${err.detail}`);
                }
            } catch (error) {
                showNotification(`An error occurred: ${error.message}`);
            }
        });
    }

    // --- NEW: ACCOUNT PAGE LOGIC ---
    function loadUserProfile(user) {
        // Get all elements
        const profileUsername = document.getElementById('profileUsername');
        const profileEmail = document.getElementById('profileEmail');
        const emailInput = document.getElementById('emailInput');
        const editEmailBtn = document.getElementById('editEmailBtn');
        const saveEmailBtn = document.getElementById('saveEmailBtn');
        const cancelEmailBtn = document.getElementById('cancelEmailBtn');
        const emailDisplayMode = document.getElementById('emailDisplayMode');
        const emailEditMode = document.getElementById('emailEditMode');

        if (!profileUsername) return; // Make sure we're on the right page

        // 1. Populate fields
        profileUsername.innerText = user.username;
        profileEmail.innerText = user.email;
        emailInput.value = user.email;

        // 2. Add event listeners
        editEmailBtn.addEventListener('click', () => {
            emailDisplayMode.classList.add('hidden');
            emailEditMode.classList.remove('hidden');
        });

        cancelEmailBtn.addEventListener('click', () => {
            emailDisplayMode.classList.remove('hidden');
            emailEditMode.classList.add('hidden');
            emailInput.value = profileEmail.innerText; // Reset to original value
        });

        saveEmailBtn.addEventListener('click', async () => {
            const newEmail = emailInput.value;
            if (newEmail === profileEmail.innerText) {
                // No change
                emailDisplayMode.classList.remove('hidden');
                emailEditMode.classList.add('hidden');
                return;
            }

            // Show loading state
            saveEmailBtn.disabled = true;
            saveEmailBtn.innerText = "Saving...";

            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/users/me/update-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ new_email: newEmail })
                });

                if (response.ok) {
                    const updatedUser = await response.json();
                    // Update UI with new email
                    profileEmail.innerText = updatedUser.email;
                    emailInput.value = updatedUser.email;
                    showNotification("Email updated successfully!");
                } else {
                    const err = await response.json();
                    showNotification(`Error: ${err.detail}`);
                }

            } catch (error) {
                showNotification(`An error occurred: ${error.message}`);
            } finally {
                // Reset UI
                saveEmailBtn.disabled = false;
                saveEmailBtn.innerText = "Save";
                emailDisplayMode.classList.remove('hidden');
                emailEditMode.classList.add('hidden');
            }
        });
    }

    // This local function needs to be defined *before* checkLoginStatus runs
    function renderAccountInterests() {
        const interestsDisplayArea = document.getElementById('interestsDisplayArea');
        if (!interestsDisplayArea) return;
        const interests = getSelectedInterests();
        interestsDisplayArea.innerHTML = '';

        if (interests.length === 0) {
            interestsDisplayArea.innerHTML = '<p style="color: var(--color-text-muted); font-style: italic;">No interests selected.</p>';
            return;
        }

        interests.forEach(interest => {
            const pill = document.createElement('span');
            pill.classList.add('interest-pill');
            pill.textContent = interest;
            interestsDisplayArea.appendChild(pill);
        });
    }

    // --- Run on every page load ---
    checkLoginStatus(); // This now handles auth AND populating the account page

}); // --- End of DOMContentLoaded ---