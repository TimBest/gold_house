// Sample Overpass API response (subset).
// One building way with 4 nodes, building:levels = 2.
export const overpassBuilding = {
  elements: [
    {
      type: "way",
      id: 100,
      tags: { building: "yes", "building:levels": "2" },
      geometry: [
        { lat: 41.5050, lon: -73.9700 },
        { lat: 41.5050, lon: -73.9695 },
        { lat: 41.5054, lon: -73.9695 },
        { lat: 41.5054, lon: -73.9700 },
        { lat: 41.5050, lon: -73.9700 },
      ],
    },
  ],
};

export const overpassBuildingNoLevels = {
  elements: [
    {
      type: "way",
      id: 101,
      tags: { building: "yes" },
      geometry: [
        { lat: 41.5050, lon: -73.9700 },
        { lat: 41.5050, lon: -73.9695 },
        { lat: 41.5054, lon: -73.9695 },
        { lat: 41.5054, lon: -73.9700 },
      ],
    },
  ],
};

export const overpassEmpty = { elements: [] };
