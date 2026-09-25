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

    // 8. Setup Music Controller
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
    const modal = document.getElementById('photo-modal');
    const modalImg = document.getElementById('modal-img');
    const modalCaption = document.getElementById('modal-caption');
    const closeModal = document.getElementById('close-modal');

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

        if (photo.isTextArt || !photo.url) {
            const artText = window.THANH_TEXT_ART || "Thanh Thanh Thanh...";
            card.innerHTML = `
                <div class="polaroid-tape"></div>
                <div class="polaroid-img-box text-art-img-box">
                    <pre class="polaroid-text-art">${artText}</pre>
                </div>
                <div class="polaroid-caption">${photo.caption || "ng đẹp ✨"}</div>
            `;

            card.addEventListener('click', () => {
                const modalTextArtBox = document.getElementById('modal-text-art-box');
                const modalTextArt = document.getElementById('modal-text-art');
                if (modal && modalCaption) {
                    if (modalImg) modalImg.classList.add('hidden');
                    if (modalTextArtBox && modalTextArt) {
                        modalTextArt.textContent = artText;
                        modalTextArtBox.classList.remove('hidden');
                    }
                    modalCaption.textContent = photo.caption || "ng đẹp ✨";
                    modal.classList.remove('hidden-modal');
                }
            });
        } else {
            card.innerHTML = `
                <div class="polaroid-tape"></div>
                <div class="polaroid-img-box">
                    <img src="${photo.url}" alt="Memory ${idx + 1}" loading="lazy">
                </div>
                <div class="polaroid-caption">${photo.caption}</div>
            `;

            card.addEventListener('click', () => {
                const modalTextArtBox = document.getElementById('modal-text-art-box');
                if (modal && modalImg && modalCaption) {
                    if (modalTextArtBox) modalTextArtBox.classList.add('hidden');
                    modalImg.classList.remove('hidden');
                    modalImg.src = photo.url;
                    modalCaption.textContent = photo.caption;
                    modal.classList.remove('hidden-modal');
                }
            });
        }

        grid.appendChild(card);
    });

    if (closeModal && modal) {
        closeModal.addEventListener('click', () => {
            modal.classList.add('hidden-modal');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.add('hidden-modal');
        });
    }
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

// ==================== 8. TEXT PORTRAIT CANVAS (PHOTOSHOP STYLE) ====================
function initTextArt() {
    const canvas = document.getElementById('text-portrait-canvas');
    const hint   = document.querySelector('.portrait-hint');
    if (!canvas) return;

    const portrait = window.THANH_PORTRAIT;
    if (!portrait) { if (hint) hint.textContent = 'Lỗi dữ liệu.'; return; }

    const GRID_W = portrait.width;
    const GRID_H = portrait.height;

    // Decode base64 → Uint8Array luminance
    const raw = atob(portrait.data);
    const luma = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) luma[i] = raw.charCodeAt(i);

    function getBrightness(x, y) {
        return luma[y * GRID_W + x] / 255; // 0..1
    }

    // Canvas size
    const CANVAS_W = 600;
    const CANVAS_H = Math.round(CANVAS_W * (GRID_H / GRID_W));
    canvas.width  = CANVAS_W;
    canvas.height = CANVAS_H;

    const ctx = canvas.getContext('2d');

    // Dark background
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const scaleX = CANVAS_W / GRID_W;
    const scaleY = CANVAS_H / GRID_H;

    const WORD = 'Thanh';

    // Collect subject pixels only (background baked as 255 = skip)
    const positions = [];
    for (let sy = 0; sy < GRID_H; sy++) {
        for (let sx = 0; sx < GRID_W; sx++) {
            const b = getBrightness(sx, sy);
            if (b < 0.90) positions.push({ sx, sy, b }); // 0.90 = background cutoff (255/255 ≈ 1.0)
        }
    }

    // Shuffle for organic look
    for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    const drawn = new Set();

    positions.forEach(({ sx, sy, b }) => {
        const darkness = 1 - b;
        if (darkness < 0.12) return; // only skip near-255 background leftovers

        // De-duplicate by cell to avoid overcrowding
        const key = `${Math.floor(sx/2)}_${Math.floor(sy/2)}`;
        if (drawn.has(key)) return;
        drawn.add(key);

        const fontSize = Math.round(6 + darkness * 9); // 6–15 px
        const angle    = (Math.random() - 0.5) * 0.55; // slight rotation
        const alpha    = 0.30 + darkness * 0.70;        // brighter where darker

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `600 ${fontSize}px 'Quicksand', sans-serif`;
        ctx.fillStyle = '#ff85a2';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const cx = (sx + 0.5) * scaleX;
        const cy = (sy + 0.5) * scaleY;
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.fillText(WORD, 0, 0);
        ctx.restore();
    });

    // Vignette
    const vignette = ctx.createRadialGradient(
        CANVAS_W/2, CANVAS_H/2, CANVAS_H * 0.22,
        CANVAS_W/2, CANVAS_H/2, CANVAS_H * 0.72
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(13,13,26,0.70)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    if (hint) hint.textContent = '✨ Được vẽ bằng hàng nghìn chữ "Thanh" 🌸';
}
