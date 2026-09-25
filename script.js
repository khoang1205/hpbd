// ===================================================
// PASTEL BIRTHDAY WEBSITE - INTERACTIVE LOGIC (3D WEBGL EDITION)
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

    // 7. Setup Music Controller
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

                // Dim room ambient light for 3D cake candle moment
                if (toId === 'cake-section') {
                    if (roomOverlay) roomOverlay.classList.add('dimmed');
                    // Initialize Three.js 3D WebGL Scene
                    setTimeout(init3DCakeScene, 100);
                }
            }
        });
    }
}

// ==================== 3D THREE.JS WEBGL SCENE SETUP ====================
let scene3D, camera3D, renderer3D, controls3D;
let flames3D = [];
let flameLights3D = [];
let is3DCakeInitialized = false;

function init3DCakeScene() {
    if (is3DCakeInitialized) return;
    const holder = document.getElementById('three-canvas-holder');
    if (!holder || typeof THREE === 'undefined') return;

    is3DCakeInitialized = true;
    const width = holder.clientWidth || 400;
    const height = holder.clientHeight || 280;

    // 1. Scene
    scene3D = new THREE.Scene();

    // 2. Camera
    camera3D = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera3D.position.set(0, 3.8, 9.2);

    // 3. Renderer
    renderer3D = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer3D.setSize(width, height);
    renderer3D.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer3D.shadowMap.enabled = true;
    holder.appendChild(renderer3D.domElement);

    // 4. OrbitControls for 360 Rotation
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls3D = new THREE.OrbitControls(camera3D, renderer3D.domElement);
        controls3D.enableDamping = true;
        controls3D.dampingFactor = 0.05;
        controls3D.autoRotate = true;
        controls3D.autoRotateSpeed = 1.0;
        controls3D.maxPolarAngle = Math.PI / 2 + 0.05;
        controls3D.minDistance = 5;
        controls3D.maxDistance = 14;
    }

    // 5. Lights
    const ambientLight = new THREE.AmbientLight(0xfff5f8, 0.95);
    scene3D.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    scene3D.add(dirLight);

    const softFillLight = new THREE.PointLight(0xff85a2, 0.6, 20);
    softFillLight.position.set(-5, 5, -5);
    scene3D.add(softFillLight);

    // 6. Build 3D Cake Group
    const cakeGroup = new THREE.Group();
    cakeGroup.position.y = -1.1;

    // Glass Pedestal Plate
    const plateGeo = new THREE.CylinderGeometry(3.6, 3.8, 0.18, 64);
    const plateMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.1,
        metalness: 0.2,
        transparent: true,
        opacity: 0.88
    });
    const plateMesh = new THREE.Mesh(plateGeo, plateMat);
    plateMesh.position.y = 0;
    cakeGroup.add(plateMesh);

    // Tier 1 (Bottom - Strawberry Pink)
    const t1Geo = new THREE.CylinderGeometry(2.8, 2.9, 1.2, 64);
    const t1Mat = new THREE.MeshStandardMaterial({ color: 0xff85a2, roughness: 0.35 });
    const t1Mesh = new THREE.Mesh(t1Geo, t1Mat);
    t1Mesh.position.y = 0.7;
    cakeGroup.add(t1Mesh);

    // Tier 1 Cream Rim
    const rim1Geo = new THREE.TorusGeometry(2.82, 0.08, 16, 64);
    const creamMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const rim1Mesh = new THREE.Mesh(rim1Geo, creamMat);
    rim1Mesh.rotation.x = Math.PI / 2;
    rim1Mesh.position.y = 1.3;
    cakeGroup.add(rim1Mesh);

    // Tier 2 (Middle - Lavender)
    const t2Geo = new THREE.CylinderGeometry(2.0, 2.1, 1.0, 64);
    const t2Mat = new THREE.MeshStandardMaterial({ color: 0xc8b6ff, roughness: 0.35 });
    const t2Mesh = new THREE.Mesh(t2Geo, t2Mat);
    t2Mesh.position.y = 1.8;
    cakeGroup.add(t2Mesh);

    // Tier 2 Cream Rim
    const rim2Geo = new THREE.TorusGeometry(2.02, 0.07, 16, 64);
    const rim2Mesh = new THREE.Mesh(rim2Geo, creamMat);
    rim2Mesh.rotation.x = Math.PI / 2;
    rim2Mesh.position.y = 2.3;
    cakeGroup.add(rim2Mesh);

    // Tier 3 (Top - Vanilla Cream)
    const t3Geo = new THREE.CylinderGeometry(1.3, 1.4, 0.9, 64);
    const t3Mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
    const t3Mesh = new THREE.Mesh(t3Geo, t3Mat);
    t3Mesh.position.y = 2.75;
    cakeGroup.add(t3Mesh);

    // 3D Strawberries on Top Tier
    const strawGeo = new THREE.ConeGeometry(0.18, 0.35, 16);
    const strawMat = new THREE.MeshStandardMaterial({ color: 0xff4d6d, roughness: 0.3 });
    const strawPos = [
        { x: -0.75, z: 0.4 },
        { x: 0.75, z: 0.4 },
        { x: 0, z: -0.85 }
    ];

    strawPos.forEach(p => {
        const s = new THREE.Mesh(strawGeo, strawMat);
        s.position.set(p.x, 3.35, p.z);
        s.rotation.z = 0.1;
        cakeGroup.add(s);
    });

    // 3D Candles & Flames
    const candlePos = [
        { x: -0.5, z: -0.2 },
        { x: 0.5, z: -0.2 },
        { x: 0, z: 0.45 }
    ];

    const candleGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 32);
    const candleMat = new THREE.MeshStandardMaterial({ color: 0xffb3c6, roughness: 0.4 });
    const flameGeo = new THREE.ConeGeometry(0.12, 0.3, 16);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });

    candlePos.forEach((p, idx) => {
        // Candle stick
        const candleMesh = new THREE.Mesh(candleGeo, candleMat);
        candleMesh.position.set(p.x, 3.6, p.z);
        cakeGroup.add(candleMesh);

        // Wick
        const wickGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8);
        const wickMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
        const wickMesh = new THREE.Mesh(wickGeo, wickMat);
        wickMesh.position.set(p.x, 4.05, p.z);
        cakeGroup.add(wickMesh);

        // 3D Glowing Flame Cone
        const flameMesh = new THREE.Mesh(flameGeo, flameMat);
        flameMesh.position.set(p.x, 4.25, p.z);
        cakeGroup.add(flameMesh);
        flames3D.push(flameMesh);

        // 3D Point Light at Flame
        const flameLight = new THREE.PointLight(0xffaa00, 1.8, 6);
        flameLight.position.set(p.x, 4.3, p.z);
        cakeGroup.add(flameLight);
        flameLights3D.push(flameLight);
    });

    scene3D.add(cakeGroup);

    // Animation Loop
    function animate3D() {
        requestAnimationFrame(animate3D);

        if (controls3D) controls3D.update();

        // Candle flame flicker animation
        if (!isCandleBlown) {
            const time = Date.now() * 0.008;
            flames3D.forEach((f, i) => {
                const s = 1 + Math.sin(time + i * 2) * 0.15;
                f.scale.set(s, s * 1.1, s);
                f.rotation.z = Math.sin(time * 1.5 + i) * 0.08;
            });
            flameLights3D.forEach((l, i) => {
                l.intensity = 1.6 + Math.sin(time * 2 + i) * 0.4;
            });
        }

        renderer3D.render(scene3D, camera3D);
    }

    animate3D();

    // Handle Window Resize for 3D Canvas
    window.addEventListener('resize', () => {
        if (!holder || !renderer3D || !camera3D) return;
        const w = holder.clientWidth || 400;
        const h = holder.clientHeight || 280;
        camera3D.aspect = w / h;
        camera3D.updateProjectionMatrix();
        renderer3D.setSize(w, h);
    });
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

    const roomOverlay = document.getElementById('room-dim-overlay');

    // 1. 3D Flames extinguish animation
    flames3D.forEach(f => {
        gsap.to(f.scale, { x: 0, y: 0, z: 0, duration: 0.3 });
    });
    flameLights3D.forEach(l => {
        gsap.to(l, { intensity: 0, duration: 0.3 });
    });

    // 2. Dramatic momentary Blackout Flash (dập nến vụt tắt!)
    setTimeout(() => {
        if (roomOverlay) roomOverlay.classList.add('blackout');

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
        
        // Random slight rotation between -6deg and 6deg
        const rotation = (Math.random() * 12 - 6).toFixed(1);
        card.style.setProperty('--rotation', rotation);

        card.innerHTML = `
            <div class="polaroid-tape"></div>
            <div class="polaroid-img-box">
                <img src="${photo.url}" alt="Memory ${idx + 1}" loading="lazy">
            </div>
            <div class="polaroid-caption">${photo.caption}</div>
        `;

        card.addEventListener('click', () => {
            if (modal && modalImg && modalCaption) {
                modalImg.src = photo.url;
                modalCaption.textContent = photo.caption;
                modal.classList.remove('hidden-modal');
            }
        });

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
