/**
 * Uganda Geography Seed Data
 * Complete hierarchy: Region → Sub-Region → District
 * Source: Official Uganda administrative divisions
 */

export interface UgandaDistrict {
    district: string;
    subRegion: string;
    region: string;
}

export const UGANDA_GEOGRAPHY: UgandaDistrict[] = [
    // ═══════════════════════════════════════════
    // 🇺🇬 CENTRAL REGION
    // ═══════════════════════════════════════════
    // Buganda
    { district: "Buikwe", subRegion: "Buganda", region: "Central" },
    { district: "Bukomansimbi", subRegion: "Buganda", region: "Central" },
    { district: "Butambala", subRegion: "Buganda", region: "Central" },
    { district: "Buvuma", subRegion: "Buganda", region: "Central" },
    { district: "Gomba", subRegion: "Buganda", region: "Central" },
    { district: "Kalangala", subRegion: "Buganda", region: "Central" },
    { district: "Kalungu", subRegion: "Buganda", region: "Central" },
    { district: "Kampala", subRegion: "Buganda", region: "Central" },
    { district: "Kasanda", subRegion: "Buganda", region: "Central" },
    { district: "Kayunga", subRegion: "Buganda", region: "Central" },
    { district: "Kiboga", subRegion: "Buganda", region: "Central" },
    { district: "Kyankwanzi", subRegion: "Buganda", region: "Central" },
    { district: "Kyotera", subRegion: "Buganda", region: "Central" },
    { district: "Luwero", subRegion: "Buganda", region: "Central" },
    { district: "Lwengo", subRegion: "Buganda", region: "Central" },
    { district: "Lyantonde", subRegion: "Buganda", region: "Central" },
    { district: "Masaka", subRegion: "Buganda", region: "Central" },
    { district: "Mityana", subRegion: "Buganda", region: "Central" },
    { district: "Mpigi", subRegion: "Buganda", region: "Central" },
    { district: "Mubende", subRegion: "Buganda", region: "Central" },
    { district: "Mukono", subRegion: "Buganda", region: "Central" },
    { district: "Nakaseke", subRegion: "Buganda", region: "Central" },
    { district: "Nakasongola", subRegion: "Buganda", region: "Central" },
    { district: "Rakai", subRegion: "Buganda", region: "Central" },
    { district: "Sembabule", subRegion: "Buganda", region: "Central" },
    { district: "Wakiso", subRegion: "Buganda", region: "Central" },

    // ═══════════════════════════════════════════
    // 🌅 EASTERN REGION
    // ═══════════════════════════════════════════
    // Busoga
    { district: "Bugiri", subRegion: "Busoga", region: "Eastern" },
    { district: "Bugweri", subRegion: "Busoga", region: "Eastern" },
    { district: "Buyende", subRegion: "Busoga", region: "Eastern" },
    { district: "Iganga", subRegion: "Busoga", region: "Eastern" },
    { district: "Jinja", subRegion: "Busoga", region: "Eastern" },
    { district: "Kaliro", subRegion: "Busoga", region: "Eastern" },
    { district: "Kamuli", subRegion: "Busoga", region: "Eastern" },
    { district: "Luuka", subRegion: "Busoga", region: "Eastern" },
    { district: "Mayuge", subRegion: "Busoga", region: "Eastern" },
    { district: "Namayingo", subRegion: "Busoga", region: "Eastern" },
    { district: "Namutumba", subRegion: "Busoga", region: "Eastern" },

    // Bugisu
    { district: "Bududa", subRegion: "Bugisu", region: "Eastern" },
    { district: "Manafwa", subRegion: "Bugisu", region: "Eastern" },
    { district: "Mbale", subRegion: "Bugisu", region: "Eastern" },
    { district: "Namisindwa", subRegion: "Bugisu", region: "Eastern" },
    { district: "Sironko", subRegion: "Bugisu", region: "Eastern" },

    // Bukedi
    { district: "Budaka", subRegion: "Bukedi", region: "Eastern" },
    { district: "Butaleja", subRegion: "Bukedi", region: "Eastern" },
    { district: "Kibuku", subRegion: "Bukedi", region: "Eastern" },
    { district: "Pallisa", subRegion: "Bukedi", region: "Eastern" },
    { district: "Tororo", subRegion: "Bukedi", region: "Eastern" },

    // Teso
    { district: "Amuria", subRegion: "Teso", region: "Eastern" },
    { district: "Bukedea", subRegion: "Teso", region: "Eastern" },
    { district: "Kaberamaido", subRegion: "Teso", region: "Eastern" },
    { district: "Kalaki", subRegion: "Teso", region: "Eastern" },
    { district: "Kapelebyong", subRegion: "Teso", region: "Eastern" },
    { district: "Katakwi", subRegion: "Teso", region: "Eastern" },
    { district: "Kumi", subRegion: "Teso", region: "Eastern" },
    { district: "Ngora", subRegion: "Teso", region: "Eastern" },
    { district: "Serere", subRegion: "Teso", region: "Eastern" },
    { district: "Soroti", subRegion: "Teso", region: "Eastern" },

    // Sebei
    { district: "Bukwo", subRegion: "Sebei", region: "Eastern" },
    { district: "Kapchorwa", subRegion: "Sebei", region: "Eastern" },
    { district: "Kween", subRegion: "Sebei", region: "Eastern" },

    // ═══════════════════════════════════════════
    // 🌍 NORTHERN REGION
    // ═══════════════════════════════════════════
    // Acholi
    { district: "Agago", subRegion: "Acholi", region: "Northern" },
    { district: "Amuru", subRegion: "Acholi", region: "Northern" },
    { district: "Gulu", subRegion: "Acholi", region: "Northern" },
    { district: "Kitgum", subRegion: "Acholi", region: "Northern" },
    { district: "Lamwo", subRegion: "Acholi", region: "Northern" },
    { district: "Nwoya", subRegion: "Acholi", region: "Northern" },
    { district: "Omoro", subRegion: "Acholi", region: "Northern" },
    { district: "Pader", subRegion: "Acholi", region: "Northern" },

    // Lango
    { district: "Alebtong", subRegion: "Lango", region: "Northern" },
    { district: "Amolatar", subRegion: "Lango", region: "Northern" },
    { district: "Apac", subRegion: "Lango", region: "Northern" },
    { district: "Dokolo", subRegion: "Lango", region: "Northern" },
    { district: "Kwania", subRegion: "Lango", region: "Northern" },
    { district: "Kole", subRegion: "Lango", region: "Northern" },
    { district: "Lira", subRegion: "Lango", region: "Northern" },
    { district: "Oyam", subRegion: "Lango", region: "Northern" },

    // West Nile
    { district: "Adjumani", subRegion: "West Nile", region: "Northern" },
    { district: "Arua", subRegion: "West Nile", region: "Northern" },
    { district: "Koboko", subRegion: "West Nile", region: "Northern" },
    { district: "Maracha", subRegion: "West Nile", region: "Northern" },
    { district: "Madi-Okollo", subRegion: "West Nile", region: "Northern" },
    { district: "Moyo", subRegion: "West Nile", region: "Northern" },
    { district: "Nebbi", subRegion: "West Nile", region: "Northern" },
    { district: "Obongi", subRegion: "West Nile", region: "Northern" },
    { district: "Pakwach", subRegion: "West Nile", region: "Northern" },
    { district: "Terego", subRegion: "West Nile", region: "Northern" },
    { district: "Yumbe", subRegion: "West Nile", region: "Northern" },
    { district: "Zombo", subRegion: "West Nile", region: "Northern" },

    // Karamoja
    { district: "Abim", subRegion: "Karamoja", region: "Northern" },
    { district: "Amudat", subRegion: "Karamoja", region: "Northern" },
    { district: "Kaabong", subRegion: "Karamoja", region: "Northern" },
    { district: "Karenga", subRegion: "Karamoja", region: "Northern" },
    { district: "Kotido", subRegion: "Karamoja", region: "Northern" },
    { district: "Moroto", subRegion: "Karamoja", region: "Northern" },
    { district: "Nakapiripirit", subRegion: "Karamoja", region: "Northern" },
    { district: "Nabilatuk", subRegion: "Karamoja", region: "Northern" },
    { district: "Napak", subRegion: "Karamoja", region: "Northern" },

    // ═══════════════════════════════════════════
    // 🌄 WESTERN REGION
    // ═══════════════════════════════════════════
    // Ankole
    { district: "Buhweju", subRegion: "Ankole", region: "Western" },
    { district: "Bushenyi", subRegion: "Ankole", region: "Western" },
    { district: "Ibanda", subRegion: "Ankole", region: "Western" },
    { district: "Isingiro", subRegion: "Ankole", region: "Western" },
    { district: "Kiruhura", subRegion: "Ankole", region: "Western" },
    { district: "Kazo", subRegion: "Ankole", region: "Western" },
    { district: "Mbarara", subRegion: "Ankole", region: "Western" },
    { district: "Mitooma", subRegion: "Ankole", region: "Western" },
    { district: "Ntungamo", subRegion: "Ankole", region: "Western" },
    { district: "Rwampara", subRegion: "Ankole", region: "Western" },
    { district: "Rubirizi", subRegion: "Ankole", region: "Western" },
    { district: "Sheema", subRegion: "Ankole", region: "Western" },

    // Kigezi
    { district: "Kabale", subRegion: "Kigezi", region: "Western" },
    { district: "Kanungu", subRegion: "Kigezi", region: "Western" },
    { district: "Kisoro", subRegion: "Kigezi", region: "Western" },
    { district: "Rukungiri", subRegion: "Kigezi", region: "Western" },
    { district: "Rubanda", subRegion: "Kigezi", region: "Western" },
    { district: "Rukiga", subRegion: "Kigezi", region: "Western" },

    // Bunyoro
    { district: "Buliisa", subRegion: "Bunyoro", region: "Western" },
    { district: "Hoima", subRegion: "Bunyoro", region: "Western" },
    { district: "Kagadi", subRegion: "Bunyoro", region: "Western" },
    { district: "Kakumiro", subRegion: "Bunyoro", region: "Western" },
    { district: "Kibaale", subRegion: "Bunyoro", region: "Western" },
    { district: "Kikuube", subRegion: "Bunyoro", region: "Western" },
    { district: "Kiryandongo", subRegion: "Bunyoro", region: "Western" },
    { district: "Masindi", subRegion: "Bunyoro", region: "Western" },

    // Tooro
    { district: "Bundibugyo", subRegion: "Tooro", region: "Western" },
    { district: "Bunyangabu", subRegion: "Tooro", region: "Western" },
    { district: "Fort Portal", subRegion: "Tooro", region: "Western" },
    { district: "Kabarole", subRegion: "Tooro", region: "Western" },
    { district: "Kamwenge", subRegion: "Tooro", region: "Western" },
    { district: "Kasese", subRegion: "Tooro", region: "Western" },
    { district: "Kyegegwa", subRegion: "Tooro", region: "Western" },
    { district: "Kyenjojo", subRegion: "Tooro", region: "Western" },
    { district: "Ntoroko", subRegion: "Tooro", region: "Western" },
];

/**
 * Region summary helpers
 */
export const UGANDA_REGIONS = ["Central", "Eastern", "Northern", "Western"] as const;

export const UGANDA_SUB_REGIONS: Record<string, string[]> = {
    Central: ["Buganda"],
    Eastern: ["Busoga", "Bugisu", "Bukedi", "Teso", "Sebei"],
    Northern: ["Acholi", "Lango", "West Nile", "Karamoja"],
    Western: ["Ankole", "Kigezi", "Bunyoro", "Tooro"],
};

export const REGION_COLORS: Record<string, string> = {
    Central: "#16a34a",  // Green
    Eastern: "#e8a317",  // Amber
    Northern: "#2563eb",  // Blue
    Western: "#7c3aed",  // Purple
};

export const SUB_REGION_EMOJI: Record<string, string> = {
    Buganda: "🟢",
    Busoga: "🟡", Bugisu: "🟡", Bukedi: "🟡", Teso: "🟡", Sebei: "🟡",
    Acholi: "🔵", Lango: "🔵", "West Nile": "🔵", Karamoja: "🔵",
    Ankole: "🟣", Kigezi: "🟣", Bunyoro: "🟣", Tooro: "🟣",
};

export function getDistrictsForRegion(region: string): UgandaDistrict[] {
    return UGANDA_GEOGRAPHY.filter((d) => d.region === region);
}

export function getDistrictsForSubRegion(subRegion: string): UgandaDistrict[] {
    return UGANDA_GEOGRAPHY.filter((d) => d.subRegion === subRegion);
}

export function getRegionForDistrict(district: string): string | null {
    return UGANDA_GEOGRAPHY.find((d) => d.district === district)?.region ?? null;
}

export function getSubRegionForDistrict(district: string): string | null {
    return UGANDA_GEOGRAPHY.find((d) => d.district === district)?.subRegion ?? null;
}
