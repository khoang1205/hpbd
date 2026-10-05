(() => {
    const dialog = document.getElementById('portrait-viewer');
    const viewport = dialog.querySelector('.portrait-viewport');
    const stage = dialog.querySelector('.portrait-stage');
    const image = dialog.querySelector('.portrait-vector');
    const status = dialog.querySelector('[role="status"]');
    const title = dialog.querySelector('h2');
    const zoomOut = dialog.querySelector('[data-zoom="out"]');
    const zoomIn = dialog.querySelector('[data-zoom="in"]');
    const reset = dialog.querySelector('[data-zoom="reset"]');
    const pointers = new Map();
    let zoom = 1, fitWidth = 0, ratio = 1, ready = false, previousOverflow = '';
    let frame = 0, pendingGesture = null;

    function dimensions(value) {
        const width = fitWidth * value, height = width / ratio;
        return { width, height, left: Math.max(0, (viewport.clientWidth - width) / 2), top: Math.max(0, (viewport.clientHeight - height) / 2) };
    }

    function setZoom(value, x = viewport.clientWidth / 2, y = viewport.clientHeight / 2) {
        if (!ready) return;
        const old = dimensions(zoom);
        const px = (viewport.scrollLeft + x - old.left) / old.width;
        const py = (viewport.scrollTop + y - old.top) / old.height;
        zoom = Math.max(1, Math.min(12, value));
        const next = dimensions(zoom);
        stage.style.width = `${Math.max(viewport.clientWidth, next.width)}px`;
        stage.style.height = `${Math.max(viewport.clientHeight, next.height)}px`;
        // Resize the SVG itself so the browser redraws vector paths at each zoom.
        // Avoid a CSS transform that can magnify a cached bitmap on mobile.
        Object.assign(image.style, { width: `${next.width}px`, height: `${next.height}px`, left: `${next.left}px`, top: `${next.top}px` });
        viewport.scrollLeft = next.left + px * next.width - x;
        viewport.scrollTop = next.top + py * next.height - y;
        reset.textContent = `${Math.round(zoom * 100)}%`;
        zoomOut.disabled = zoom <= 1;
        zoomIn.disabled = zoom >= 12;
    }

    function fit() {
        if (!ready) return;
        fitWidth = Math.min(viewport.clientWidth, viewport.clientHeight * ratio);
        setZoom(1);
        viewport.scrollTo(0, 0);
    }

    document.querySelectorAll('[data-portrait-src]').forEach(button => {
        button.addEventListener('click', () => {
            ready = false;
            image.hidden = true;
            zoom = 1;
            title.textContent = button.dataset.portraitTitle;
            status.textContent = 'Đang tải tranh nét cao…';
            status.hidden = false;
            zoomIn.disabled = zoomOut.disabled = reset.disabled = true;
            previousOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            dialog.showModal();
            image.onload = () => {
                if (!dialog.open) return;
                ratio = image.naturalWidth / image.naturalHeight;
                ready = true;
                image.hidden = false;
                reset.disabled = false;
                status.hidden = true;
                fit();
            };
            image.onerror = () => { status.textContent = 'Chưa tải được tranh. Đóng và mở lại để thử nhé.'; };
            image.alt = button.dataset.portraitTitle;
            image.src = button.dataset.portraitSrc;
        });
    });

    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
        ready = false;
        image.onload = image.onerror = null;
        image.removeAttribute('src');
        image.hidden = true;
        pointers.clear();
        cancelAnimationFrame(frame);
        frame = 0;
        pendingGesture = null;
        document.body.style.overflow = previousOverflow;
    });
    zoomIn.addEventListener('click', () => setZoom(zoom * 1.5));
    zoomOut.addEventListener('click', () => setZoom(zoom / 1.5));
    reset.addEventListener('click', fit);
    window.addEventListener('resize', () => { if (dialog.open) fit(); });
    viewport.addEventListener('dblclick', event => {
        const box = viewport.getBoundingClientRect();
        setZoom(zoom > 1 ? 1 : 3, event.clientX - box.left, event.clientY - box.top);
    });
    viewport.addEventListener('wheel', event => {
        if (!event.ctrlKey) return;
        event.preventDefault();
        const box = viewport.getBoundingClientRect();
        setZoom(zoom * Math.exp(-event.deltaY * .01), event.clientX - box.left, event.clientY - box.top);
    }, { passive: false });
    dialog.addEventListener('keydown', event => {
        if (['+', '=', '-', '0'].includes(event.key)) {
            event.preventDefault();
            if (event.key === '0') fit();
            else setZoom(zoom * (event.key === '-' ? 1 / 1.5 : 1.5));
        }
    });

    function gesture() {
        const points = [...pointers.values()].slice(0, 2);
        if (!points.length) return null;
        const a = points[0], b = points[1] || a;
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y), count: points.length };
    }
    function flushGesture() {
        frame = 0;
        const next = gesture(), prev = pendingGesture;
        if (next && prev && next.count === prev.count) {
            if (next.count === 2 && prev.distance > 0) setZoom(zoom * next.distance / prev.distance, prev.x, prev.y);
            viewport.scrollLeft -= next.x - prev.x;
            viewport.scrollTop -= next.y - prev.y;
        }
        pendingGesture = next;
    }
    viewport.addEventListener('pointerdown', event => {
        if (!ready || (event.pointerType === 'mouse' && event.button !== 0)) return;
        if (frame) { cancelAnimationFrame(frame); flushGesture(); }
        const box = viewport.getBoundingClientRect();
        pointers.set(event.pointerId, { x: event.clientX - box.left, y: event.clientY - box.top });
        pendingGesture = gesture();
        viewport.setPointerCapture(event.pointerId);
    });
    viewport.addEventListener('pointermove', event => {
        if (!pointers.has(event.pointerId)) return;
        const box = viewport.getBoundingClientRect();
        pointers.set(event.pointerId, { x: event.clientX - box.left, y: event.clientY - box.top });
        if (!frame) frame = requestAnimationFrame(flushGesture);
    });
    function endPointer(event) {
        if (frame) { cancelAnimationFrame(frame); flushGesture(); }
        pointers.delete(event.pointerId);
        pendingGesture = gesture();
    }
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => viewport.addEventListener(type, endPointer));
})();
