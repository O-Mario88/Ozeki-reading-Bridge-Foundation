type SubRegionEntry = {
  subRegion: string;
  districts: string[];
};

type RegionEntry = {
  region: string;
  subRegions: SubRegionEntry[];
  districts: string[];
};

const regionSeed: {
  region: string;
  subRegions: SubRegionEntry[];
}[] = [
    {
      region: "Central Region",
      subRegions: [
        {
          subRegion: "Buganda",
          districts: [
            "Buikwe", "Bukomansimbi", "Butambala", "Buvuma", "Gomba",
            "Kalangala", "Kalungu", "Kampala", "Kasanda", "Kayunga",
            "Kiboga", "Kyankwanzi", "Kyotera", "Luwero", "Lwengo",
            "Lyantonde", "Masaka", "Mityana", "Mpigi", "Mubende",
            "Mukono", "Nakaseke", "Nakasongola", "Rakai", "Sembabule",
            "Wakiso",
          ],
        },
      ],
    },
    {
      region: "Eastern Region",
      subRegions: [
        {
          subRegion: "Busoga",
          districts: [
            "Bugiri", "Bugweri", "Buyende", "Iganga", "Jinja",
            "Kaliro", "Kamuli", "Luuka", "Mayuge", "Namayingo",
            "Namutumba",
          ],
        },
        {
          subRegion: "Bugisu",
          districts: [
            "Bududa", "Manafwa", "Mbale", "Namisindwa", "Sironko",
          ],
        },
        {
          subRegion: "Bukedi",
          districts: [
            "Budaka", "Butaleja", "Kibuku", "Pallisa", "Tororo",
          ],
        },
        {
          subRegion: "Teso",
          districts: [
            "Amuria", "Bukedea", "Kaberamaido", "Kalaki", "Kapelebyong",
            "Katakwi", "Kumi", "Ngora", "Serere", "Soroti",
          ],
        },
        {
          subRegion: "Sebei",
          districts: ["Bukwo", "Kapchorwa", "Kween"],
        },
      ],
    },
    {
      region: "Northern Region",
      subRegions: [
        {
          subRegion: "Acholi",
          districts: [
            "Agago", "Amuru", "Gulu", "Kitgum", "Lamwo",
            "Nwoya", "Omoro", "Pader",
          ],
        },
        {
          subRegion: "Lango",
          districts: [
            "Alebtong", "Amolatar", "Apac", "Dokolo", "Kwania",
            "Kole", "Lira", "Oyam",
          ],
        },
        {
          subRegion: "West Nile",
          districts: [
            "Adjumani", "Arua", "Koboko", "Maracha", "Madi-Okollo",
            "Moyo", "Nebbi", "Obongi", "Pakwach", "Terego",
            "Yumbe", "Zombo",
          ],
        },
        {
          subRegion: "Karamoja",
          districts: [
            "Abim", "Amudat", "Kaabong", "Karenga", "Kotido",
            "Moroto", "Nakapiripirit", "Nabilatuk", "Napak",
          ],
        },
      ],
    },
    {
      region: "Western Region",
      subRegions: [
        {
          subRegion: "Ankole",
          districts: [
            "Buhweju", "Bushenyi", "Ibanda", "Isingiro", "Kiruhura",
            "Kazo", "Mbarara", "Mitooma", "Ntungamo", "Rwampara",
            "Rubirizi", "Sheema",
          ],
        },
        {
          subRegion: "Kigezi",
          districts: [
            "Kabale", "Kanungu", "Kisoro", "Rukungiri", "Rubanda",
            "Rukiga",
          ],
        },
        {
          subRegion: "Bunyoro",
          districts: [
            "Buliisa", "Hoima", "Kagadi", "Kakumiro", "Kibaale",
            "Kikuube", "Kiryandongo", "Masindi",
          ],
        },
        {
          subRegion: "Tooro",
          districts: [
            "Bundibugyo", "Bunyangabu", "Fort Portal", "Kabarole",
            "Kamwenge", "Kasese", "Kyegegwa", "Kyenjojo", "Ntoroko",
          ],
        },
      ],
    },
  ];

function uniqueDistricts(items: string[]) {
  return [...new Set(items.map((entry) => entry.trim()).filter(Boolean))];
}

export const ugandaRegions: RegionEntry[] = regionSeed.map((entry) => {
  const allDistricts = entry.subRegions.flatMap((sr) => sr.districts);
  return {
    region: entry.region,
    subRegions: entry.subRegions.map((sr) => ({
      subRegion: sr.subRegion,
      districts: uniqueDistricts(sr.districts),
    })),
    districts: uniqueDistricts(allDistricts),
  };
});

const districtsByRegion = new Map<string, string[]>(
  ugandaRegions.map((entry) => [entry.region, entry.districts]),
);

const regionByDistrict = new Map<string, string>();
const subRegionByDistrict = new Map<string, string>();
ugandaRegions.forEach((entry) => {
  entry.subRegions.forEach((sr) => {
    sr.districts.forEach((district) => {
      regionByDistrict.set(district, entry.region);
      subRegionByDistrict.set(district, sr.subRegion);
    });
  });
});

export const allUgandaDistricts = [...regionByDistrict.keys()].sort((a, b) =>
  a.localeCompare(b),
);

export function getDistrictsByRegion(region: string) {
  return districtsByRegion.get(region) ?? [];
}

export function inferRegionFromDistrict(district: string) {
  return regionByDistrict.get(district) ?? null;
}

export function inferSubRegionFromDistrict(district: string) {
  return subRegionByDistrict.get(district) ?? null;
}

export function getSubRegionsByRegion(region: string) {
  const entry = ugandaRegions.find((r) => r.region === region);
  return entry?.subRegions ?? [];
}
