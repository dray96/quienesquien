# ¿Quién es Quién? - Juego Multijugador Web

Una versión web multijugador del clásico juego de mesa "¿Quién es Quién?" implementada con WebSockets.

## Demostración en vivo

[Próximamente]

## Características

- Juego multijugador en tiempo real
- Interfaz responsive sin frameworks externos
- Sistema de partidas con códigos únicos
- Chat integrado para preguntas y respuestas
- Temporizadores para selección y turnos
- Reconexión automática
- Modo claro/oscuro
- Filtros rápidos para descarte de personajes

## Tecnologías Utilizadas

- **Backend**: Node.js + WebSocket (ws)
- **Frontend**: HTML5, CSS3, JavaScript Vanilla
- **Datos**: JSON

## Requisitos Previos

- Node.js (v14 o superior)
- npm (v6 o superior)

## Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/TU_USUARIO/quienesquien.git
cd quien-es-quien
```

2. Instalar dependencias:
```bash
npm install
```

3. Iniciar el servidor:
```bash
npm start
```

4. Abrir el navegador en `http://localhost:3000`

## Estructura del Proyecto

```
proyecto/
├── public/                # Frontend estático
│   ├── index.html        # Interfaz principal
│   ├── css/
│   │   └── styles.css    # Estilos
│   ├── js/
│   │   └── main.js       # Lógica del cliente
│   └── img/              # Avatares de personajes
├── server.js             # Backend WebSocket
├── characters.json       # Datos de personajes
└── README.md            # Documentación
```

## Cómo Jugar

1. Ingresa tu nombre
2. Crea una nueva partida o únete a una existente con código
3. Selecciona tu personaje (20 segundos)
4. Por turnos, haz preguntas sobre el personaje de tu oponente
5. Responde las preguntas de tu oponente
6. Intenta adivinar el personaje

## Reglas

- Cada jugador tiene 30 segundos para hacer una pregunta
- Las respuestas solo pueden ser "Sí" o "No"
- Si un jugador no responde a tiempo, se revela un atributo aleatorio
- Gana el primer jugador que adivine el personaje del oponente

## Desarrollo

Para ejecutar en modo desarrollo con recarga automática:
```bash
npm run dev
```

## Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles. # quienesquien
