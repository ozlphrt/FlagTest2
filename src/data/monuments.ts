export interface MonumentData {
    name: string;
    url: string;
}

export const MONUMENTS_MAP: Record<string, MonumentData> = {
    "us": {
        name: "Statue of Liberty",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Lady_Liberty_under_a_blue_sky_%28cropped%29.jpg/256px-Lady_Liberty_under_a_blue_sky_%28cropped%29.jpg"
    },
    "fr": {
        name: "Eiffel Tower",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Tour_Eiffel_Wikimedia_Commons.jpg/256px-Tour_Eiffel_Wikimedia_Commons.jpg"
    },
    "gb": {
        name: "Big Ben",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Clock_Tower_-_Palace_of_Westminster%2C_London_-_May_2007.jpg/256px-Clock_Tower_-_Palace_of_Westminster%2C_London_-_May_2007.jpg"
    },
    "it": {
        name: "Colosseum",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Colosseum_in_Rome%2C_Italy_-_April_2007.jpg/256px-Colosseum_in_Rome%2C_Italy_-_April_2007.jpg"
    },
    "de": {
        name: "Brandenburg Gate",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Brandenburger_Tor_abends.jpg/256px-Brandenburger_Tor_abends.jpg"
    },
    "es": {
        name: "Sagrada Família",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Sagrada_Familia_01.jpg/256px-Sagrada_Familia_01.jpg"
    },
    "eg": {
        name: "Giza Pyramids",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/All_Gizah_Pyramids.jpg/256px-All_Gizah_Pyramids.jpg"
    },
    "in": {
        name: "Taj Mahal",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Taj_Mahal%2C_Agra%2C_India_-_March_2001.jpg/256px-Taj_Mahal%2C_Agra%2C_India_-_March_2001.jpg"
    },
    "jp": {
        name: "Mount Fuji",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/080103_Mount_Fuji_from_Shin-Fuji_Station.jpg/256px-080103_Mount_Fuji_from_Shin-Fuji_Station.jpg"
    },
    "cn": {
        name: "Great Wall of China",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/The_Great_Wall_of_China_at_Mutianyu.jpg/256px-The_Great_Wall_of_China_at_Mutianyu.jpg"
    },
    "br": {
        name: "Christ the Redeemer",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Christ_the_Redeemer_-_Rio_de_Janeiro%2C_Brazil.jpg/256px-Christ_the_Redeemer_-_Rio_de_Janeiro%2C_Brazil.jpg"
    },
    "au": {
        name: "Sydney Opera House",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Sydney_Opera_House_Sails.jpg/256px-Sydney_Opera_House_Sails.jpg"
    },
    "ca": {
        name: "CN Tower",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/CN_Tower_from_the_ground.jpg/256px-CN_Tower_from_the_ground.jpg"
    },
    "ru": {
        name: "Saint Basil's Cathedral",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Saint_Basil%27s_Cathedral_in_Moscow.jpg/256px-Saint_Basil%27s_Cathedral_in_Moscow.jpg"
    },
    "tr": {
        name: "Hagia Sophia",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Hagia_Sophia_Mars_2013.jpg/256px-Hagia_Sophia_Mars_2013.jpg"
    },
    "gr": {
        name: "Parthenon",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/The_Parthenon_in_Athens.jpg/256px-The_Parthenon_in_Athens.jpg"
    },
    "pe": {
        name: "Machu Picchu",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Machu_Picchu%2C_Peru.jpg/256px-Machu_Picchu%2C_Peru.jpg"
    },
    "mx": {
        name: "Chichen Itza",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Chichen_Itza_3.jpg/256px-Chichen_Itza_3.jpg"
    },
    "nl": {
        name: "Windmills of Kinderdijk",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/KinderdijkWindmills.jpg/256px-KinderdijkWindmills.jpg"
    },
    "sa": {
        name: "Kaaba",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Kaaba_Masjid_haraam_Detail.jpg/256px-Kaaba_Masjid_haraam_Detail.jpg"
    },
    "ae": {
        name: "Burj Khalifa",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Burj_Khalifa.jpg/256px-Burj_Khalifa.jpg"
    },
    "za": {
        name: "Table Mountain",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Table_Mountain_Cape_Town.jpg/256px-Table_Mountain_Cape_Town.jpg"
    },
    "kr": {
        name: "Gyeongbokgung Palace",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Gyeongbokgung_at_night.jpg/256px-Gyeongbokgung_at_night.jpg"
    },
    "th": {
        name: "Wat Arun",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Wat_Arun_Temple_of_Dawn_Bangkok.jpg/256px-Wat_Arun_Temple_of_Dawn_Bangkok.jpg"
    },
    "vn": {
        name: "Ha Long Bay",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Ha_Long_Bay_Vietnam.jpg/256px-Ha_Long_Bay_Vietnam.jpg"
    },
    "id": {
        name: "Borobudur",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Borobudur_Temple.jpg/256px-Borobudur_Temple.jpg"
    },
    "my": {
        name: "Petronas Twin Towers",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Petronas_Twin_Towers.jpg/256px-Petronas_Twin_Towers.jpg"
    },
    "sg": {
        name: "Marina Bay Sands",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Marina_Bay_Sands_in_the_evening.jpg/256px-Marina_Bay_Sands_in_the_evening.jpg"
    },
    "ph": {
        name: "Mayon Volcano",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Mayon_Volcano_Legazpi.jpg/256px-Mayon_Volcano_Legazpi.jpg"
    },
    "cl": {
        name: "Moai of Easter Island",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Easter_Island_Moai_Restored.jpg/256px-Easter_Island_Moai_Restored.jpg"
    },
    "co": {
        name: "Las Lajas Sanctuary",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Santuario_de_Las_Lajas%2C_Ipiales%2C_Colombia.jpg/256px-Santuario_de_Las_Lajas%2C_Ipiales%2C_Colombia.jpg"
    },
    "dz": {
        name: "Maqam Echahid",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Maqam_Echahid_Algiers.jpg/256px-Maqam_Echahid_Algiers.jpg"
    },
    "pk": {
        name: "Faisal Mosque",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Faisal_Mosque_Islamabad_by_Usman_Miski.jpg/256px-Faisal_Mosque_Islamabad_by_Usman_Miski.jpg"
    },
    "bd": {
        name: "Lalbagh Fort",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Lalbagh_Fort_Dhaka.jpg/256px-Lalbagh_Fort_Dhaka.jpg"
    },
    "jo": {
        name: "Petra",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Al_Khazneh_Petra_Jordan_2010.jpg/256px-Al_Khazneh_Petra_Jordan_2010.jpg"
    },
    "cu": {
        name: "El Capitolio",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Capitolio_de_La_Habana.jpg/256px-Capitolio_de_La_Habana.jpg"
    }
};
