import { POKEMON } from './pokemon.js'

const generateRoutes = (region_id) => {
    const locations = POKEMON.map(p => p.locations.filter(l => l.region_id === region_id)).flat();
    const routes = []
    const newLocations = []
    locations.forEach(location => {
        if (!routes.includes(location.location)) {
            routes.push(location.location)
            newLocations.push(location)
        }
    });
    return newLocations
}

export const ROUTES = {
    kanto: generateRoutes(0),
    hoenn: generateRoutes(1),
    unova: generateRoutes(2),
    sinnoh: generateRoutes(3),
    johto: generateRoutes(4),
}

export const REGIONS = [
    'kanto',
    'johto',
    'hoenn',
    'sinnoh',
    'unova'
]

export const ENCOUNTER_TRIGGERS = [
{
    name: "Very Common",
    order: 0,
    color: "#C0C0C0"
},
{
    name: "Common",
    order: 1,
    color: "#C0C0C0"
},
{
    name: "Horde",
    order: 2,
    color: "#FFFFFF"
},
{
    name: "Uncommon",
    order: 3,
    color: "#1eff00"
},
{
    name: "Rare",
    order: 4,
    color: "#0070dd"
},
{
    name: "Very Rare",
    order: 5,
    color: "#a335ee"
},
{
    name: "Lure",
    order: 6,
    color: "#ffd100"
},
{
    name: "Special",
    order: 7,
    color: "#ff8c00"
}
];

export const ENCOUNTER_TYPE = [
    "Grass",
    "Cave",
    "Water",
    "Rocks",
    "Inside",
    "Old Rod",
    "Good Rod",
    "Super Rod",
    "Honey Tree",
    "Dark Grass",
    "Fishing",
    "Shadow",
    "Dust Cloud",
    "Headbutt"
]

export const TYPE = [
    "Normal",
    "Fighting",
    "Flying",
    "Poison",
    "Ground",
    "Rock",
    "Bug",
    "Ghost",
    "Steel",
    "Fire",
    "Water",
    "Grass",
    "Electric",
    "Psychic",
    "Ice",
    "Dragon",
    "Dark",
]

export const getRegions = () => {
    return REGIONS.map(id => ({ key: id, label: id }))
}

export const getEncounterTriggers = () => {
    return ENCOUNTER_TRIGGERS
        .map(id => ({ key: id, label: id }))
}

export const getEncounterType = () => {
    return ENCOUNTER_TYPE
        .map(id => ({ key: id, label: id }))
}

export const getTypes = () => {
    return TYPE
        .map(id => ({ key: id.toUpperCase(), label: id }))
}

export const getType = (type_id) => ENCOUNTER_TYPE[type_id]

export const getRoute = (route) => {
    if (!route) return []
    return ROUTES[route.toLowerCase()].map(location => ({ key: location.location, label: location.location }))
}
