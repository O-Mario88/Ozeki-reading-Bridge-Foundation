import assert from "node:assert/strict";
import test from "node:test";
import {
  listGeoDistricts,
  listGeoRegions,
  listGeoSchools,
  listGeoSubregions,
} from "../lib/db";

function findRegionIdByName(name: string) {
  const region = listGeoRegions().find((row) => row.name.toLowerCase() === name.toLowerCase());
  assert.ok(region, `Region not found: ${name}`);
  return region.id;
}

function findSubRegionIdByName(name: string, regionId: string) {
  const subRegion = listGeoSubregions(regionId).find(
    (row) => row.name.toLowerCase() === name.toLowerCase(),
  );
  assert.ok(subRegion, `Sub-region not found: ${name}`);
  return subRegion.id;
}

test("Northern region sub-regions do not include Eastern sub-regions", () => {
  const northernRegionId = findRegionIdByName("Northern Region");
  const northernSubRegions = listGeoSubregions(northernRegionId).map((row) => row.name);
  const lowerSet = new Set(northernSubRegions.map((value) => value.toLowerCase()));

  assert.ok(lowerSet.has("acholi"));
  assert.ok(lowerSet.has("lango"));
  assert.ok(lowerSet.has("karamoja"));
  assert.ok(lowerSet.has("west nile"));

  // Eastern examples should never appear in Northern list.
  assert.ok(!lowerSet.has("teso"));
  assert.ok(!lowerSet.has("busoga"));
  assert.ok(!lowerSet.has("bugisu"));
  assert.ok(!lowerSet.has("sebei"));
});

test("Lango selection returns only Lango districts (and excludes Acholi examples)", () => {
  const northernRegionId = findRegionIdByName("Northern Region");
  const langoSubRegionId = findSubRegionIdByName("Lango", northernRegionId);
  const langoDistricts = listGeoDistricts(langoSubRegionId).map((row) => row.name.toLowerCase());
  const districtSet = new Set(langoDistricts);

  assert.ok(districtSet.has("lira"));
  assert.ok(districtSet.has("dokolo"));
  assert.ok(districtSet.has("oyam"));

  // Acholi examples should not appear in Lango district list.
  assert.ok(!districtSet.has("gulu"));
  assert.ok(!districtSet.has("kitgum"));
  assert.ok(!districtSet.has("amuru"));
});

test("Gulu district school selection returns only schools mapped to Gulu", () => {
  const allDistricts = listGeoDistricts();
  const gulu = allDistricts.find((row) => row.name.toLowerCase() === "gulu");
  assert.ok(gulu, "Gulu district not found in geo hierarchy");

  const schools = listGeoSchools(gulu.id);
  schools.forEach((school) => {
    assert.equal(
      school.district.trim().toLowerCase(),
      "gulu",
      `School ${school.name} was outside Gulu district`,
    );
  });
});
