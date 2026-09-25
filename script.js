// ===================================================
// PASTEL BIRTHDAY WEBSITE - INTERACTIVE LOGIC (KAWAII 2D EDITION)
// ===================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Load Configurations from CONFIG
    initAppConfig();

    // 2. Generate Floating Background Elements
    initAmbientElements();

    // 3. Setup Quiz & Section Transitions
    initQuizSection();

    // 4. Setup Microphone & Candle Blowing
    initCandleBlowing();

    // 5. Setup Polaroid Gallery
    initPolaroidGallery();

    // 6. Setup Scratch Card Canvas
    initScratchCard();

    // 7. Setup Text Art Generator (Made of "Thanh ")
    initTextArt();

    // 8. Setup Photo Modal & Interactive Zoom Lightbox
    initPhotoModal();

    // 9. Setup Music Controller
    initMusicPlayer();
});

// ==================== 1. CONFIG INITIALIZATION ====================
function initAppConfig() {
    if (typeof CONFIG === 'undefined') return;

    // Set recipient name in UI
    const cakeName = document.getElementById('recipient-name-cake');
    const navName = document.getElementById('nav-recipient-name');
    const footerName = document.getElementById('footer-recipient');
    const quizQuestion = document.getElementById('quiz-question');
    const hintBox = document.getElementById('hint-text');
    const letterText = document.getElementById('secret-letter-text');
    const audioEl = document.getElementById('bg-music');

    if (cakeName) cakeName.textContent = CONFIG.recipientName;
    if (navName) navName.textContent = CONFIG.recipientName;
    if (footerName) footerName.textContent = CONFIG.recipientName;

    if (quizQuestion && CONFIG.secretQuiz) {
        quizQuestion.textContent = CONFIG.secretQuiz.question;
    }
    if (hintBox && CONFIG.secretQuiz) {
        hintBox.textContent = CONFIG.secretQuiz.hint;
    }
    if (letterText) {
        letterText.textContent = CONFIG.secretLetter;
    }
    if (audioEl && CONFIG.musicUrl) {
        audioEl.src = CONFIG.musicUrl;
    }
}

// ==================== 2. AMBIENT BACKGROUND ELEMENTS ====================
function initAmbientElements() {
    const container = document.getElementById('floating-elements-container');
    if (!container) return;

    // Friendly celebration icons
    const icons = ['✨', '🌸', '⭐', '🎈', '🎂', '🎉', '🎁'];
    const totalCount = 18;

    for (let i = 0; i < totalCount; i++) {
        const el = document.createElement('div');
        el.className = 'floating-element';
        el.textContent = icons[Math.floor(Math.random() * icons.length)];
        el.style.left = `${Math.random() * 95}%`;
        el.style.fontSize = `${Math.random() * 1.5 + 1}rem`;
        el.style.animationDuration = `${Math.random() * 8 + 8}s`;
        el.style.animationDelay = `${Math.random() * 5}s`;
        container.appendChild(el);
    }
}

// ==================== 3. QUIZ & SECTION TRANSITIONS ====================
function initQuizSection() {
    const btnSubmit = document.getElementById('btn-submit-quiz');
    const inputAnswer = document.getElementById('quiz-answer');
    const btnHint = document.getElementById('btn-hint');
    const hintBox = document.getElementById('hint-text');
    const errorMsg = document.getElementById('quiz-error');

    if (btnHint && hintBox) {
        btnHint.addEventListener('click', () => {
            hintBox.classList.toggle('hidden');
        });
    }

    const checkAnswer = () => {
        const rawAns = inputAnswer.value.trim().toLowerCase();
        
        // Remove Vietnamese accents for flexible comparison
        const normalized = rawAns.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // Flexible keyword detection: contains 'sinh nhật', 'xinh nhật', 'sinh nhat', 'xinh nhat', 'sn'...
        const isValid = rawAns.includes("sinh nhật") ||
                        rawAns.includes("xinh nhật") ||
                        rawAns.includes("sinh nhat") ||
                        rawAns.includes("xinh nhat") ||
                        normalized.includes("sinh nhat") ||
                        normalized.includes("xinh nhat") ||
                        rawAns.includes("sn") ||
                        (CONFIG.secretQuiz.correctAnswer && rawAns.includes(CONFIG.secretQuiz.correctAnswer.toLowerCase()));

        if (rawAns.length > 0 && isValid) {
            if (errorMsg) errorMsg.classList.add('hidden');
            inputAnswer.style.borderColor = '';
            
            // Trigger celebration confetti
            confetti({
                particleCount: 50,
                spread: 60,
                origin: { y: 0.6 }
            });

            // Transition to Section 2 (Cake)
            switchSection('unlock-section', 'cake-section');
        } else {
            if (errorMsg) {
                errorMsg.classList.remove('hidden');
                // Re-trigger CSS animation
                errorMsg.style.animation = 'none';
                void errorMsg.offsetWidth;
                errorMsg.style.animation = 'popPing 0.3s ease-out';
            }
            
            inputAnswer.style.borderColor = '#ff85a2';
            const card = document.querySelector('.quiz-card');
            
            // GSAP Shake effect on whole card & input
            if (card) {
                gsap.fromTo(card, { x: -12 }, { x: 12, duration: 0.06, repeat: 5, yoyo: true, onComplete: () => { gsap.set(card, { x: 0 }); } });
            }
        }
    };

    if (btnSubmit) btnSubmit.addEventListener('click', checkAnswer);
    if (inputAnswer) {
        inputAnswer.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') checkAnswer();
        });
    }
}

function switchSection(fromId, toId) {
    const fromEl = document.getElementById(fromId);
    const toEl = document.getElementById(toId);
    const roomOverlay = document.getElementById('room-dim-overlay');

    if (fromEl && toEl) {
        gsap.to(fromEl, {
            opacity: 0,
            duration: 0.5,
            onComplete: () => {
                fromEl.classList.remove('active-section');
                fromEl.classList.add('hidden-section');

                toEl.classList.remove('hidden-section');
                toEl.classList.add('active-section');
                gsap.fromTo(toEl, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.6 });

                // Dim room ambient light for birthday cake candle moment
                if (toId === 'cake-section' && roomOverlay) {
                    roomOverlay.classList.add('dimmed');
                }
            }
        });
    }
}

// ==================== 4. CANDLE BLOWING & WEB AUDIO API ====================
let audioContext;
let analyser;
let micStream;
let isCandleBlown = false;

function initCandleBlowing() {
    const btnStartMic = document.getElementById('btn-start-mic');
    const btnManualBlow = document.getElementById('btn-manual-blow');

    if (btnStartMic) {
        btnStartMic.addEventListener('click', startMicDetection);
    }

    if (btnManualBlow) {
        btnManualBlow.addEventListener('click', triggerBlowSuccess);
    }
}

let micStartTime = 0;
let consecutiveBlowCount = 0;

async function startMicDetection() {
    const btnStartMic = document.getElementById('btn-start-mic');
    try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        
        const microphone = audioContext.createMediaStreamSource(micStream);
        microphone.connect(analyser);
        analyser.fftSize = 256;

        micStartTime = Date.now();
        consecutiveBlowCount = 0;

        if (btnStartMic) {
            btnStartMic.innerHTML = `<i class="fa-solid fa-check"></i> Mic Đã Bật! Hãy Thổi`;
            btnStartMic.style.background = 'linear-gradient(135deg, #b8f2e6 0%, #a2d2ff 100%)';
            btnStartMic.style.color = '#1b4965';
        }

        listenMicVolume();
    } catch (err) {
        alert("Không thể truy cập Microphone. Bạn hãy chọn nút 'Thổi Nến Bằng Tay' bên cạnh nhé!");
        console.warn("Mic access denied or unavailable:", err);
    }
}

function listenMicVolume() {
    if (isCandleBlown) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
    }
    const average = sum / dataArray.length;

    // Grace period: Ignore audio check for first 500ms after turning on mic to prevent click/warmup noise
    const isWarmedUp = (Date.now() - micStartTime) > 500;

    // Update Mic Level UI Bar
    const levelFill = document.getElementById('mic-level');
    if (levelFill) {
        const percentage = Math.min(100, Math.max(0, (average / 80) * 100));
        levelFill.style.width = `${percentage}%`;
    }

    // Check if blow volume steadily exceeds threshold
    const threshold = CONFIG.micThreshold || 40;
    if (isWarmedUp && average > threshold) {
        consecutiveBlowCount++;
        // Require steady blow for at least 4 consecutive frames
        if (consecutiveBlowCount >= 4) {
            triggerBlowSuccess();
            return;
        }
    } else {
        consecutiveBlowCount = 0;
    }

    requestAnimationFrame(listenMicVolume);
}

function triggerBlowSuccess() {
    if (isCandleBlown) return;
    isCandleBlown = true;

    const flames = document.querySelectorAll('.flame-2d');
    const smokes = document.querySelectorAll('.smoke-2d');
    const roomOverlay = document.getElementById('room-dim-overlay');
    const cakeAura = document.getElementById('cake-aura');

    // 1. Flames flicker wildly from blowing wind
    flames.forEach(flame => flame.classList.add('flicker-out'));

    // 2. Dramatic momentary Blackout Flash (dập nến vụt tắt!)
    setTimeout(() => {
        if (roomOverlay) roomOverlay.classList.add('blackout');

        // Extinguish flames & glowing aura
        flames.forEach(flame => flame.classList.add('extinguished'));
        if (cakeAura) cakeAura.classList.add('extinguished');
        smokes.forEach(smoke => smoke.classList.add('active'));

        // 3. Room lights turn back on, fireworks explosion & music starts!
        setTimeout(() => {
            if (roomOverlay) {
                roomOverlay.classList.remove('blackout');
                roomOverlay.classList.remove('dimmed');
            }

            // Play Background Audio
            playMusic();

            // Trigger Big Celebration Confetti Burst
            fireCelebrationConfetti();

            // Transition to Main Festival Playground
            setTimeout(() => {
                switchSection('cake-section', 'playground-section');
            }, 2500);
        }, 350);
    }, 400);
}

function fireCelebrationConfetti() {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 999 };

    function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
            return clearInterval(interval);
        }
        const particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
}

// ==================== 5. POLAROID PHOTO GALLERY ====================
function initPolaroidGallery() {
    const grid = document.getElementById('polaroid-grid');
    if (!grid) return;

    // Direct user message if photos array is empty
    const photos = (CONFIG.photos && CONFIG.photos.length > 0) ? CONFIG.photos : null;

    if (!photos) {
        grid.style.display = 'flex';
        grid.style.justifyContent = 'center';

        const emptyCard = document.createElement('div');
        emptyCard.className = 'polaroid-card empty-polaroid-card';
        emptyCard.style.maxWidth = '380px';
        emptyCard.style.width = '100%';

        const emptyMsg = CONFIG.emptyPhotoMessage || "Vì toi không có ảnh nào của ng đẹp nên để ở đây tượng trưng, sau này có thì sẽ bổ sung sau ✨";

        emptyCard.innerHTML = `
            <div class="polaroid-tape"></div>
            <div class="polaroid-img-box empty-box">
                <i class="fa-solid fa-camera-retro empty-icon"></i>
                <div class="sparkle-icon">✨</div>
            </div>
            <div class="polaroid-caption empty-caption">${emptyMsg}</div>
        `;

        grid.appendChild(emptyCard);
        return;
    }

    photos.forEach((photo, idx) => {
        const card = document.createElement('div');
        card.className = 'polaroid-card';
        
        // Random slight rotation between -4deg and 4deg
        const rotation = (Math.random() * 8 - 4).toFixed(1);
        card.style.setProperty('--rotation', rotation);

        card.innerHTML = `
            <div class="polaroid-tape"></div>
            <div class="polaroid-img-box">
                <img src="${photo.url}" alt="Memory ${idx + 1}" loading="lazy">
            </div>
            <div class="polaroid-caption">${photo.caption}</div>
        `;

        card.addEventListener('click', () => {
            if (typeof openPhotoModal === 'function') {
                openPhotoModal(photo.url, photo.caption);
            }
        });

        grid.appendChild(card);
    });
}

// ==================== 6. SCRATCH CARD CANVAS ====================
function initScratchCard() {
    const canvas = document.getElementById('scratch-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let scratchedPercentage = 0;

    // Set high-resolution canvas size based on parent container
    const setupCanvasSize = () => {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width || 600;
        canvas.height = rect.height || 350;
        drawScratchCover(ctx, canvas.width, canvas.height);
    };

    setupCanvasSize();
    window.addEventListener('resize', setupCanvasSize);

    // Event Listeners for scratch
    const getPos = (e) => {
        const r = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const scaleX = canvas.width / r.width;
        const scaleY = canvas.height / r.height;
        return {
            x: (clientX - r.left) * scaleX,
            y: (clientY - r.top) * scaleY
        };
    };

    const scratch = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getPos(e);

        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 28, 0, Math.PI * 2);
        ctx.fill();

        checkScratchedPercent();
    };

    canvas.addEventListener('mousedown', (e) => { isDrawing = true; scratch(e); });
    canvas.addEventListener('mousemove', scratch);
    window.addEventListener('mouseup', () => { isDrawing = false; });

    canvas.addEventListener('touchstart', (e) => { isDrawing = true; scratch(e); }, { passive: false });
    canvas.addEventListener('touchmove', scratch, { passive: false });
    window.addEventListener('touchend', () => { isDrawing = false; });

    function checkScratchedPercent() {
        if (scratchedPercentage > 45) return; // Already revealed

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        let transparentPixels = 0;

        for (let i = 3; i < pixels.length; i += 16) { // Sample every 4th pixel
            if (pixels[i] === 0) transparentPixels++;
        }

        scratchedPercentage = (transparentPixels / (pixels.length / 16)) * 100;

        if (scratchedPercentage > 45) {
            // Smooth fade out canvas completely
            gsap.to(canvas, {
                opacity: 0,
                duration: 0.8,
                onComplete: () => {
                    canvas.style.display = 'none';
                    confetti({ particleCount: 40, spread: 50 });
                }
            });
        }
    }
}

function drawScratchCover(ctx, width, height) {
    // Pastel Gradient Overlay
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#ffb3c6');
    grad.addColorStop(0.5, '#c8b6ff');
    grad.addColorStop(1, '#b5e2fa');
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Decorative Text & Pattern
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Quicksand, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨ Cào ở đây để mở bức thư bí mật ✨', width / 2, height / 2);

    ctx.font = '14px Quicksand, sans-serif';
    ctx.fillText('⭐ Di chuột hoặc ngón tay để cào ⭐', width / 2, height / 2 + 35);
}

// ==================== 7. MUSIC PLAYER CONTROLLER ====================
function initMusicPlayer() {
    const audioEl = document.getElementById('bg-music');
    const btnToggle = document.getElementById('btn-music-toggle');
    const discIcon = document.getElementById('music-disc-icon');
    const statusText = document.getElementById('music-status-text');

    if (!btnToggle || !audioEl) return;

    btnToggle.addEventListener('click', () => {
        if (audioEl.paused) {
            playMusic();
        } else {
            pauseMusic();
        }
    });

    function pauseMusic() {
        audioEl.pause();
        if (discIcon) discIcon.classList.remove('fa-spin');
        if (statusText) statusText.textContent = 'Phát nhạc';
    }
}

function playMusic() {
    const audioEl = document.getElementById('bg-music');
    const discIcon = document.getElementById('music-disc-icon');
    const statusText = document.getElementById('music-status-text');

    if (audioEl) {
        audioEl.play().then(() => {
            if (discIcon) discIcon.classList.add('fa-spin');
            if (statusText) statusText.textContent = 'Đang phát nhạc';
        }).catch(err => {
            console.warn("Autoplay prevented:", err);
        });
    }
}

// ==================== 8. TEXT PORTRAIT ART (TYPOGRAPHY PHOTO VIEWER) ====================
function initTextArt() {
    const wrapper = document.getElementById('text-portrait-wrapper');
    if (!wrapper) return;

    wrapper.addEventListener('click', () => {
        if (typeof openPhotoModal === 'function') {
            openPhotoModal('assets/typography_thanh_color.png', 'Bức họa chân dung tạo từ hàng nghìn chữ "Thanh" 🌸');
        }
    });
}

// ==================== 9. PHOTO MODAL WITH PINCH-ZOOM & PAN ====================
let openPhotoModal = null;
let closePhotoModal = null;

function initPhotoModal() {
    const modal = document.getElementById('photo-modal');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const closeModalBtn = document.getElementById('close-modal');
    const modalImg = document.getElementById('modal-img');
    const modalCaption = document.getElementById('modal-caption');
    const modalViewport = document.getElementById('modal-image-viewport');
    const zoomInBtn = document.getElementById('modal-zoom-in');
    const zoomOutBtn = document.getElementById('modal-zoom-out');
    const zoomResetBtn = document.getElementById('modal-zoom-reset');

    if (!modal || !modalImg) return;

    let scale = 1.0;
    let translateX = 0;
    let translateY = 0;
    const MIN_SCALE = 1.0;
    const MAX_SCALE = 6.0;

    function updateTransform(smooth = true) {
        if (!modalImg) return;
        modalImg.style.transition = smooth ? 'transform 0.15s ease-out' : 'none';
        modalImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        
        if (modalViewport) {
            if (scale > 1.05) {
                modalViewport.style.cursor = 'grab';
            } else {
                modalViewport.style.cursor = 'default';
                translateX = 0;
                translateY = 0;
            }
        }
    }

    function resetZoom() {
        scale = 1.0;
        translateX = 0;
        translateY = 0;
        updateTransform(true);
    }

    openPhotoModal = function(src, caption = '') {
        modalImg.src = src;
        if (modalCaption) modalCaption.textContent = caption;
        resetZoom();
        modal.classList.remove('hidden-modal');
        document.body.style.overflow = 'hidden';
    };

    closePhotoModal = function() {
        modal.classList.add('hidden-modal');
        document.body.style.overflow = '';
        resetZoom();
    };

    // Close button events (Click & Touch)
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closePhotoModal();
        });
        closeModalBtn.addEventListener('touchend', (e) => {
            e.stopPropagation();
            e.preventDefault();
            closePhotoModal();
        });
    }

    // Backdrop click event
    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', closePhotoModal);
        modalBackdrop.addEventListener('touchend', (e) => {
            e.preventDefault();
            closePhotoModal();
        });
    }

    // Modal wrapper click fallback
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closePhotoModal();
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden-modal')) {
            closePhotoModal();
        }
    });

    // Zoom Toolbar buttons
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            scale = Math.min(MAX_SCALE, scale + 0.6);
            updateTransform(true);
        });
    }
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            scale = Math.max(MIN_SCALE, scale - 0.6);
            if (scale <= 1.05) resetZoom();
            else updateTransform(true);
        });
    }
    if (zoomResetBtn) {
        zoomResetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            resetZoom();
        });
    }

    // Touch & Mouse Interactive Zoom / Pan
    if (modalViewport) {
        let isDragging = false;
        let startX = 0, startY = 0;
        let lastTap = 0;
        let initialPinchDist = 0;
        let initialScale = 1.0;

        // Double tap on mobile / click on desktop to toggle zoom
        modalViewport.addEventListener('click', (e) => {
            const now = Date.now();
            if (now - lastTap < 320) {
                if (scale > 1.2) {
                    resetZoom();
                } else {
                    scale = 2.8;
                    updateTransform(true);
                }
            }
            lastTap = now;
        });

        // Touch event handlers (Pinch to zoom + 1 finger drag)
        modalViewport.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                // Pinch start
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                initialPinchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                initialScale = scale;
            } else if (e.touches.length === 1 && scale > 1.05) {
                // Pan start
                isDragging = true;
                startX = e.touches[0].clientX - translateX;
                startY = e.touches[0].clientY - translateY;
            }
        }, { passive: false });

        modalViewport.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && initialPinchDist > 0) {
                e.preventDefault();
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                const newScale = initialScale * (dist / initialPinchDist);
                scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
                updateTransform(false);
            } else if (e.touches.length === 1 && isDragging && scale > 1.05) {
                e.preventDefault();
                translateX = e.touches[0].clientX - startX;
                translateY = e.touches[0].clientY - startY;
                updateTransform(false);
            }
        }, { passive: false });

        modalViewport.addEventListener('touchend', (e) => {
            if (e.touches.length < 2) initialPinchDist = 0;
            if (e.touches.length === 0) {
                isDragging = false;
                if (scale < 1.05) resetZoom();
            }
        });

        // Desktop Mouse Drag & Wheel Zoom
        modalViewport.addEventListener('mousedown', (e) => {
            if (scale > 1.05) {
                isDragging = true;
                startX = e.clientX - translateX;
                startY = e.clientY - translateY;
                modalViewport.classList.add('is-dragging');
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (isDragging && scale > 1.05) {
                translateX = e.clientX - startX;
                translateY = e.clientY - startY;
                updateTransform(false);
            }
        });

        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                modalViewport.classList.remove('is-dragging');
            }
        });

        modalViewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.3 : 0.3;
            scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale + delta));
            if (scale <= 1.05) resetZoom();
            else updateTransform(true);
        }, { passive: false });
    }
}

