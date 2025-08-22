export let POKEMON = [];
let DEX = [];
export let catchRates = [];

export async function loadPokemonData() {
    try {
        const [pokemonResponse, dexResponse, catchRatesResponse] = await Promise.all([
            fetch('data/pokemmo/monsters.json'),
            fetch('data/pokemmo/dex.json'),
            fetch('data/catchRates.json')
        ]);

        if (!pokemonResponse.ok || !dexResponse.ok || !catchRatesResponse.ok) {
            throw new Error('Failed to fetch one or more Pokémon data files.');
        }

        const allPokemon = await pokemonResponse.json();
        DEX = await dexResponse.json();
        catchRates = await catchRatesResponse.json();

        // POKEMON = allPokemon.filter(p => p.obtainable === true);
        POKEMON = allPokemon;

    } catch (error) {
        console.error("Error loading core Pokémon data:", error);
        throw error;
    }
}
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

export const EVOLUTION_TYPES = {
    ITEM: 'ITEM',
    LEVEL: 'LEVEL',
};

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