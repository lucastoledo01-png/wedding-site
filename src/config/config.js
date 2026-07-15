const config = {
  data: {
    // Main invitation title that appears on the page
    title: "Casamento Lucas & Andressa",
    // Opening message/description of the invitation
    description:
      "Com alegria, convidamos você para celebrar o nosso casamento.",
    // Groom's name
    groomName: "Lucas",
    // Bride's name
    brideName: "Andressa",
    // Groom's parents names
    parentGroom: "Familia do Lucas",
    // Bride's parents names
    parentBride: "Familia da Andressa",
    // Wedding date (format: YYYY-MM-DD)
    date: "2026-11-14",
    // Google Maps link for location (short clickable link)
    maps_url:
      "https://www.google.com/maps/search/?api=1&query=Restaurante%20Farol%20HCCW%2B76%20Monte%20Si%C3%A3o%20Minas%20Gerais",
    // Google Maps embed code to display map on website
    // How to get: open Google Maps → select location → Share → Embed → copy link
    maps_embed:
      "https://www.google.com/maps?q=Restaurante%20Farol%20HCCW%2B76%20Monte%20Si%C3%A3o%20Minas%20Gerais&output=embed",
    // Event time (free format, example: "10:00 - 12:00 WIB")
    time: "14 de novembro de 2026",
    // Venue/building name
    location: "Restaurante Farol",
    // Full address of the wedding venue
    address:
      "Bairro Por do Sol - R. Maria R. C. Silva, 3850 - Por do Sol, Monte Siao - MG, 37580-000",
    // Image that appears when link is shared on social media
    ogImage: "/images/lucas-andressa-background.webp",
    // Icon that appears in browser tab
    favicon: "/images/favicon.ico",
    // List of event agenda/schedule
    agenda: [
      {
        // First event name
        title: "Cerimônia",
        // Event date (format: YYYY-MM-DD)
        date: "2026-11-14",
        // Start time (format: HH:MM)
        startTime: "20:00",
        // End time (format: HH:MM)
        endTime: "21:00",
        // Event venue
        location: "Santuário Nossa Senhora da Medalha Milagrosa",
        // Full address
        address: "Rua Padre Cornelio, 27 - Centro, Monte Siao - MG, 37580-000",
      },
      {
        // Second event name
        title: "Recepção",
        date: "2026-11-14",
        startTime: "21:30",
        endTime: "23:59",
        location: "Restaurante Farol",
        address:
          "Bairro Por do Sol - R. Maria R. C. Silva, 3850 - Por do Sol, Monte Siao - MG, 37580-000",
      },
      // You can add more agenda items with the same format
    ],

    // Background music settings
    audio: {
      // Music file (choose one or replace with your own file)
      src: "",
      soundcloudUrl:
        "https://soundcloud.com/lucas-wd/jorge-e-mateus-a-hora-e-agora,https://soundcloud.com/creitu-silva-7/jorge-e-mateus-os-anjos-cantam-nosso-amor",
      // Music title to display
      title: "A Hora é Agora, Os Anjos Cantam Nosso Amor",
      // Whether music plays automatically when website opens
      autoplay: true,
      // Whether music repeats continuously
      loop: true,
    },

    heroSlides: [
      {
        imageUrl: "/images/hero-slide-1.jpg",
        altText: "Lucas e Andressa no Jardim Botânico",
      },
      {
        imageUrl: "/images/hero-slide-2.jpg",
        altText: "Lucas e Andressa caminhando juntos",
      },
      {
        imageUrl: "/images/hero-slide-3.jpg",
        altText: "Lucas e Andressa em frente ao Jardim Botânico",
      },
      {
        imageUrl: "/images/hero-slide-6.jpg",
        altText: "Lucas e Andressa no jardim",
      },
      {
        imageUrl: "/images/hero-slide-7.jpg",
        altText: "Lucas e Andressa entre flores",
      },
      {
        imageUrl: "/images/hero-slide-8.jpg",
        altText: "Lucas e Andressa no Jardim Botânico",
      },
      {
        imageUrl: "/images/hero-slide-9.jpg",
        altText: "Lucas e Andressa abraçados",
      },
      {
        imageUrl: "/images/hero-slide-10.webp",
        altText: "Lucas e Andressa observando o jardim",
      },
      {
        imageUrl: "/images/hero-slide-11.webp",
        altText: "Lucas e Andressa sentados no Jardim Botânico",
      },
      {
        imageUrl: "/images/hero-slide-12.webp",
        altText: "Lucas e Andressa na escadaria do Jardim Botânico",
      },
    ],

    // List of bank accounts for digital envelope/gifts
    banks: [],
  },
};

export default config;
