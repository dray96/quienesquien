function generateAvatar(name, size = 150) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');

    // Generar color de fondo basado en el nombre
    const hue = Math.abs(name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360);
    context.fillStyle = `hsl(${hue}, 70%, 80%)`;
    context.fillRect(0, 0, size, size);

    // Añadir iniciales
    context.fillStyle = `hsl(${hue}, 70%, 30%)`;
    context.font = `${size/2}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(name.charAt(0).toUpperCase(), size/2, size/2);

    return canvas.toDataURL('image/png');
} 