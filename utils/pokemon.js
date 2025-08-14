export let POKEMON = [];
let DEX = [];
export let catchRates = [];

export async function loadPokemonData() {
    try {
        const [pokemonResponse, dexResponse, catchRatesResponse] = await Promise.all([
            fetch(new URL('../../data/pokemmo/monsters.json', import.meta.url).href),
            fetch(new URL('../../data/pokemmo/dex.json', import.meta.url).href),
            fetch(new URL('../data/catchRates.json', import.meta.url).href)
        ]);

        if (!pokemonResponse.ok || !dexResponse.ok || !catchRatesResponse.ok) {
            throw new Error('Failed to fetch one or more Pokémon data files.');
        }

        const allPokemon = await pokemonResponse.json();
        DEX = await dexResponse.json();
        catchRates = await catchRatesResponse.json();

        POKEMON = allPokemon.filter(p => p.id <= 648);

    } catch (error) {
        console.error("Error loading core Pokémon data:", error);
        throw error;
    }
}

export const EGG_GROUPS = {
    "monster": { label: "monster", color: "#775544" },
    "water a": { label: "water a", color: "#66ccff" },
    "bug": { label: "bug", color: "#aabb22" },
    "flying": { label: "flying", color: "#8899ff" },
    "field": { label: "field", color: "#ddbb55" },
    "fairy": { label: "fairy", color: "#ee99ee" },
    "plant": { label: "plant", color: "#77cc55" },
    "humanoid": { label: "humanoid", color: "#bb5544" },
    "water c": { label: "water c", color: "#3399ff" },
    "mineral": { label: "mineral", color: "#bbaa67" },
    "chaos": { label: "chaos", color: "#7070bf" },
    "water b": { label: "water b", color: "#4d9ec6" },
    "ditto": { label: "ditto", color: "#cabbd7" },
    "dragon": { label: "dragon", color: "#7766ed" },
    "cannot breed": { label: "cannot breed", color: "#8a8a8a" },
    "genderless": { label: "genderless", color: "#8a8a8a" }
};

export const TYPES = {
    "NORMAL": { label: "Normal", color: "#a4acaf" },
    "FIGHTING": { label: "Fighting", color: "#d56723" },
    "FLYING": { label: "Flying", color: "#3dc7ef" },
    "POISON": { label: "Poison", color: "#b97fc9" },
    "GROUND": { label: "Ground", color: "#ab9842" },
    "ROCK": { label: "Rock", color: "#a38c21" },
    "BUG": { label: "Bug", color: "#729f3f" },
    "GHOST": { label: "Ghost", color: "#7b62a3" },
    "STEEL": { label: "Steel", color: "#9eb7b8" },
    "FIRE": { label: "Fire", color: "#fd7d24" },
    "WATER": { label: "Water", color: "#4592c4" },
    "GRASS": { label: "Grass", color: "#9bcc50" },
    "ELECTRIC": { label: "Electric", color: "#eed535" },
    "PSYCHIC": { label: "Psychic", color: "#f366b9" },
    "ICE": { label: "Ice", color: "#51c4e7" },
    "DRAGON": { label: "Dragon", color: "#f16e57" },
    "DARK": { label: "Dark", color: "#707070" },
};

export const getEggGroups = () => {
    return Object.keys(EGG_GROUPS)
        .map(id => ({ key: id, label: EGG_GROUPS[id].label }))
};

export const getEggGroup = id => EGG_GROUPS[id];

export const getType = id => TYPES[id];

export const getGenderRatioInfo = (genderRatio) => {
    switch (genderRatio) {
        case 127: return { ratio: "50% Male, 50% Female", maleCost: "5000", femaleCost: "5000" };
        case 31: return { ratio: "12.5% Female, 87.5% Male", maleCost: "5000", femaleCost: "21000" };
        case 63: return { ratio: "25% Female, 75% Male", maleCost: "9000", femaleCost: "5000" };
        case 191: return { ratio: "75% Female, 25% Male", maleCost: "5000", femaleCost: "9000" };
        case 0: return { ratio: "100% Male" };
        case 254: return { ratio: "100% Female" };
        case 255: return { ratio: "Genderless" };
        default: return { ratio: "Unknown", maleCost: "N/A", femaleCost: "N/A" };
    }
};

export const getPokemon = (pkmnid) => POKEMON.find(({ id }) => id === pkmnid);

export const getPokeDexID = (pkmnid, region) => {
    const entry = DEX.find(({ id }) => id === pkmnid);
    if (entry) return entry[region];
};

export const getPokeDexIDs = (pkmnid) => {
    return {
        kanto_dex: getPokeDexID(pkmnid, "kanto"),
        johto_dex: getPokeDexID(pkmnid, "johto"),
        hoenn_dex: getPokeDexID(pkmnid, "hoenn"),
        sinnoh_dex: getPokeDexID(pkmnid, "sinnoh"),
        unova_dex: getPokeDexID(pkmnid, "unova"),
    };
};

export const getBaseForm = (id) => {
    let pkmn = POKEMON.find(pkmn => pkmn.evolutions.some(evo => evo.id === id));
    if (!pkmn) return getPokemon(id);
    while (pkmn.evolutions.some(evo => evo.id !== id)) {
        pkmn = POKEMON.find(p => p.evolutions.some(evo => evo.id === p.id));
    }
    return pkmn;
};

export const getPokemonThatCanHoldItem = (itemId) => {
    return POKEMON.filter(pkmn => pkmn.held_items.some(item => item.id === itemId));
};

export const getPokemonEvolutions = (id) => {
    const pkmn = POKEMON.find(pkmn => pkmn.id === id);
    if (pkmn) return pkmn.evoTree;
};

export const isPokemonInLocation = (data = { region: false, route: false, pokemon }) => {
    const { region, route } = data;
    if (!region && !route) return true;
    return true;
};

export const getPokemonName = id => {
    const pkmn = POKEMON.find(pkmn => pkmn.id === id);
    if (pkmn) return pkmn.name;
};