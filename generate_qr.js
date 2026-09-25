const QRCode = require('qrcode');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const websiteUrl = 'https://khoang1205.github.io/hpbd';
const artifactDir = 'C:\\Users\\ACER\\.gemini\\antigravity\\brain\\2fc8fa4f-77b2-4530-bdaf-e0009653630d';

async function generateQRCodes() {
    console.log('Generating QR codes for:', websiteUrl);

    // 1. Generate clean standalone High-Res QR code PNG
    const qrBuffer = await QRCode.toBuffer(websiteUrl, {
        width: 1000,
        margin: 2,
        color: {
            dark: '#2b2d42',
            light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
    });

    const standardQrPath = path.join(__dirname, 'assets', 'qrcode.png');
    fs.writeFileSync(standardQrPath, qrBuffer);
    fs.writeFileSync(path.join(artifactDir, 'qrcode.png'), qrBuffer);
    console.log('Standard QR code saved to assets/qrcode.png and artifacts');

    // 2. Generate a gorgeous pastel Birthday Card with QR Code
    const width = 1080;
    const height = 1440;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background Gradient (Cute Pastel Pink & Cream)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#ffe5ec');
    bgGrad.addColorStop(0.5, '#fff0f3');
    bgGrad.addColorStop(1, '#ffc2d1');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Decorative floating pastel circles/sparkles
    const drawCircle = (x, y, r, color) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    };

    drawCircle(120, 150, 70, 'rgba(255, 182, 193, 0.4)');
    drawCircle(960, 220, 90, 'rgba(255, 154, 162, 0.3)');
    drawCircle(180, 1300, 100, 'rgba(184, 242, 230, 0.4)');
    drawCircle(920, 1260, 80, 'rgba(255, 225, 230, 0.5)');

    // Main Card Box (Glass / Card style)
    const cardX = 90;
    const cardY = 120;
    const cardW = width - cardX * 2;
    const cardH = height - cardY * 2;
    const cardR = 40;

    ctx.save();
    ctx.shadowColor = 'rgba(255, 107, 139, 0.25)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;

    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, cardR);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();

    // Card border
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, cardR);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ff85a2';
    ctx.stroke();

    // Title & Typography
    ctx.textAlign = 'center';
    
    // Header icon & greeting
    ctx.fillStyle = '#ff477e';
    ctx.font = 'bold 54px sans-serif';
    ctx.fillText('🎂 HAPPY BIRTHDAY ✨', width / 2, 260);

    ctx.fillStyle = '#4a4e69';
    ctx.font = '500 36px sans-serif';
    ctx.fillText('Món quà sinh nhật đặc biệt dành cho ng đẹp 🌸', width / 2, 330);

    // QR container box
    const qrBoxSize = 580;
    const qrBoxX = (width - qrBoxSize) / 2;
    const qrBoxY = 410;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;
    ctx.beginPath();
    ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 28);
    ctx.fillStyle = '#faf0f4';
    ctx.fill();
    ctx.restore();

    // Draw QR image inside
    const qrImg = await loadImage(qrBuffer);
    const qrPadding = 30;
    ctx.drawImage(qrImg, qrBoxX + qrPadding, qrBoxY + qrPadding, qrBoxSize - qrPadding * 2, qrBoxSize - qrPadding * 2);

    // Scan Instruction Text
    ctx.fillStyle = '#ff6b8b';
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText('📱 Quét mã QR để mở hộp quà ✨', width / 2, 1070);

    ctx.fillStyle = '#7a7d93';
    ctx.font = '30px sans-serif';
    ctx.fillText('Mở camera điện thoại hoặc Zalo để quét mã', width / 2, 1130);

    // URL tag badge at bottom
    ctx.fillStyle = '#ffe5ec';
    const badgeW = 600;
    const badgeH = 60;
    ctx.beginPath();
    ctx.roundRect((width - badgeW) / 2, 1180, badgeW, badgeH, 30);
    ctx.fill();

    ctx.fillStyle = '#d90429';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(websiteUrl, width / 2, 1220);

    // Save final birthday card image
    const cardBuffer = canvas.toBuffer('image/png');
    const cardPath = path.join(__dirname, 'assets', 'qrcode_birthday_card.png');
    fs.writeFileSync(cardPath, cardBuffer);
    fs.writeFileSync(path.join(artifactDir, 'qrcode_birthday_card.png'), cardBuffer);
    console.log('Birthday QR Card saved successfully!');
}

generateQRCodes().catch(console.error);
