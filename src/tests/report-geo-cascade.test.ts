import assert from "node:assert/strict";
import test from "node:test";
import { queryPostgres } from "../lib/server/postgres/client";

async function findRegionIdByName(name: string) {
  const result = await queryPostgres<{ id: string }>(
    `
      SELECT region_id AS id
      FROM geo_regions
      WHERE lower(name) = lower($1)
      LIMIT 1
    `,
    [name],
  );
  const region = result.rows[0];
  assert.ok(region, `Region not found: ${name}`);
  return region.id;
}

async function findSubRegionIdByName(name: string, regionId: string) {
  const result = await queryPostgres<{ id: string }>(
    `
      SELECT gs.subregion_id AS id
      FROM geo_subregions gs
      JOIN geo_regions gr ON gr.id = gs.region_id
      WHERE gr.region_id = $1
        AND lower(gs.name) = lower($2)
      LIMIT 1
    `,
    [regionId, name],
  );
  const subRegion = result.rows[0];
  assert.ok(subRegion, `Sub-region not found: ${name}`);
  return subRegion.id;
}

test("Northern region sub-regions do not include Eastern sub-regions", async () => {
  const northernRegionId = await findRegionIdByName("Northern Region");
  const result = await queryPostgres<{ name: string }>(
    `
      SELECT gs.name
      FROM geo_subregions gs
      JOIN geo_regions gr ON gr.id = gs.region_id
      WHERE gr.region_id = $1
      ORDER BY gs.name ASC
    `,
    [northernRegionId],
  );
  const northernSubRegions = result.rows.map((row) => row.name);
  const lowerSet = new Set(northernSubRegions.map((value) => value.toLowerCase()));

  assert.ok(lowerSet.has("acholi"));
  assert.ok(lowerSet.has("lango"));
  assert.ok(lowerSet.has("karamoja"));
  assert.ok(lowerSet.has("west nile"));
  assert.ok(!lowerSet.has("teso"));
  assert.ok(!lowerSet.has("busoga"));
  assert.ok(!lowerSet.has("bugisu"));
  assert.ok(!lowerSet.has("sebei"));
});

test("Lango selection returns only Lango districts (and excludes Acholi examples)", async () => {
  const northernRegionId = await findRegionIdByName("Northern Region");
  const langoSubRegionId = await findSubRegionIdByName("Lango", northernRegionId);
  const result = await queryPostgres<{ name: string }>(
    `
      SELECT gd.name
      FROM geo_districts gd
      JOIN geo_subregions gs ON gs.id = gd.subregion_id
      WHERE gs.subregion_id = $1
      ORDER BY gd.name ASC
    `,
    [langoSubRegionId],
  );
  const districtSet = new Set(result.rows.map((row) => row.name.toLowerCase()));

  assert.ok(districtSet.has("lira"));
  assert.ok(districtSet.has("dokolo"));
  assert.ok(districtSet.has("oyam"));
  assert.ok(!districtSet.has("gulu"));
  assert.ok(!districtSet.has("kitgum"));
  assert.ok(!districtSet.has("amuru"));
});

test("Gulu district school selection returns only schools mapped to Gulu", async () => {
  const districtResult = await queryPostgres<{ id: string }>(
    `
      SELECT district_id AS id
      FROM geo_districts
      WHERE lower(name) = 'gulu'
      LIMIT 1
    `,
  );
  const gulu = districtResult.rows[0];
  assert.ok(gulu, "Gulu district not found in geo hierarchy");

  const schools = await queryPostgres<{ name: string; district: string }>(
    `
      SELECT name, district
      FROM schools_directory
      WHERE geo_district_id = $1
    `,
    [gulu.id],
  );
  schools.rows.forEach((school) => {
    assert.equal(
      school.district.trim().toLowerCase(),
      "gulu",
      `School ${school.name} was outside Gulu district`,
    );
  });
});
