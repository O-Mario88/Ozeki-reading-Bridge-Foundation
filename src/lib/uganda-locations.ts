type RegionEntry = {
  region: string;
  districts: string[];
};

const regionSeed: RegionEntry[] = [
  {
    region: "Central Region",
    districts: [
      "Buikwe",
      "Bukomansimbi",
      "Butambala",
      "Buvuma",
      "Gomba",
      "Kalangala",
      "Kalungu",
      "Kampala",
      "Kassanda",
      "Kayunga",
      "Kiboga",
      "Kyankwanzi",
      "Kyotera",
      "Luwero",
      "Lwengo",
      "Lyantonde",
      "Masaka",
      "Mityana",
      "Mpigi",
      "Mubende",
      "Mukono",
      "Nakaseke",
      "Nakasongola",
      "Rakai",
      "Ssembabule",
      "Wakiso",
      "Entebbe",
    ],
  },
  {
    region: "Eastern Region",
    districts: [
      "Amuria",
      "Budaka",
      "Bududa",
      "Bugiri",
      "Bugweri",
      "Bukedea",
      "Mukuju",
      "Mulanda",
      "Kisoko",
      "Bukwo",
      "Bulambuli",
      "Busia",
      "Butaleja",
      "Butebo",
      "Buyende",
      "Iganga",
      "Jinja",
      "Kaberamaido",
      "Kalaki",
      "Kaliro",
      "Kamuli",
      "Kapchorwa",
      "Kapelebyong",
      "Katakwi",
      "Kibuku",
      "Kumi",
      "Kween",
      "Luuka",
      "Manafwa",
      "Mayuge",
      "Mbale",
      "Namayingo",
      "Namisindwa",
      "Namutumba",
      "Ngora",
      "Pallisa",
      "Serere",
      "Sironko",
      "Soroti",
      "Tororo",
    ],
  },
  {
    region: "Northern Region",
    districts: [
      "Abim",
      "Adjumani",
      "Agago",
      "Alebtong",
      "Amolatar",
      "Amudat",
      "Amuru",
      "Apac",
      "Arua",
      "Dokolo",
      "Gulu",
      "Kaabong",
      "Karenga",
      "Kitgum",
      "Koboko",
      "Kole",
      "Kotido",
      "Kwania",
      "Lamwo",
      "Lira",
      "Madi-Okollo",
      "Maracha",
      "Moroto",
      "Moyo",
      "Nabilatuk",
      "Nakapiripirit",
      "Napak",
      "Nebbi",
      "Nwoya",
      "Obongi",
      "Omoro",
      "Otuke",
      "Oyam",
      "Pader",
      "Pakwach",
      "Terego",
      "Yumbe",
      "Zombo",
    ],
  },
  {
    region: "Western Region",
    districts: [
      "Buhweju",
      "Buliisa",
      "Bundibugyo",
      "Bughendera",
      "Bunyangabu",
      "Bushenyi",
      "Hoima",
      "Ibanda",
      "Isingiro",
      "Kabale",
      "Kabarole",
      "Kagadi",
      "Kakumiro",
      "Kamwenge",
      "Kanungu",
      "Kasese",
      "Kazo",
      "Kibaale",
      "Kikuube",
      "Kiruhura",
      "Kiryandongo",
      "Kisoro",
      "Kitagwenda",
      "Kyegegwa",
      "Kyenjojo",
      "Masindi",
      "Mbarara",
      "Mitooma",
      "Ntoroko",
      "Ntungamo",
      "Rubanda",
      "Rubirizi",
      "Rukiga",
      "Rukungiri",
      "Rwampara",
      "Sheema",
    ],
  },
];

function uniqueDistricts(items: string[]) {
  return [...new Set(items.map((entry) => entry.trim()).filter(Boolean))];
}

export const ugandaRegions: RegionEntry[] = regionSeed.map((entry) => ({
  region: entry.region,
  districts: uniqueDistricts(entry.districts),
}));

const districtsByRegion = new Map<string, string[]>(
  ugandaRegions.map((entry) => [entry.region, entry.districts]),
);

const regionByDistrict = new Map<string, string>();
ugandaRegions.forEach((entry) => {
  entry.districts.forEach((district) => {
    regionByDistrict.set(district, entry.region);
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
