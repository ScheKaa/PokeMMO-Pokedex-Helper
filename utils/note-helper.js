import { POKEMON } from './pokemon.js';
import { getEvolutionLine } from './dex-helper-utils.js';
import { isPokemonSafariExclusiveOnly} from './filter-helper.js';

const generateEvolutionNotes = (pokemonId, pokedexStatus) => {
    const uncatchableNames = [];
    const lureOnlyNames = [];
    const safariOnlyNames = [];
    const specialOnlyNames = [];
    const evolutionLineNames = getEvolutionLine(pokemonId);
    const originalPokemon = POKEMON.find(p => p.id === pokemonId);

    if (!originalPokemon) {
        // console.log(`generateEvolutionNotes: Original Pokémon with ID ${pokemonId} not found.`);
        return [];
    }

    // console.log(`generateEvolutionNotes: Processing evolution line for ${originalPokemon.name} (ID: ${pokemonId}). Evolution line names:`, evolutionLineNames);

    for (const evoName of evolutionLineNames) {
        const evoPokemonObj = POKEMON.find(p => p.name.toLowerCase() === evoName.toLowerCase());
        if (evoPokemonObj) {
            const isCaught = pokedexStatus[evoPokemonObj.id]?.caught;
            
            if (isCaught) {
                continue;
            }
            
            const locations = evoPokemonObj.locations || [];
            const hasCatchableLocation = locations.some(loc => loc.rarity !== 'Uncatchable' && loc.rarity !== 'Unobtainable');
            const hasLureOnlyLocation = locations.every(loc => loc.rarity === 'Lure') || (
                locations.every(loc => loc.rarity === 'Lure' || loc.rarity === 'Special') &&
                locations.some(loc => loc.rarity === 'Lure') &&
                locations.some(loc => loc.rarity === 'Special')
            );
            const hasSpecialOnlyLocation = locations.every(loc => loc.rarity === 'Special')
            
            if (!hasCatchableLocation) {
                uncatchableNames.push(evoPokemonObj.name);
            } else if (hasLureOnlyLocation && evoPokemonObj.id !== pokemonId) {
                //Exclude the original Pokémon from the lure-only note.
                lureOnlyNames.push(evoPokemonObj.name);
            } else if (hasSpecialOnlyLocation && evoPokemonObj.id !== pokemonId) {
                specialOnlyNames.push(evoPokemonObj.name);
            }

            // Check for Safari Exclusive with non-Safari evolutions
            if (isPokemonSafariExclusiveOnly(evoPokemonObj) && evoPokemonObj.id !== pokemonId) {
                const hasNonSafariEvolution = Array.from(evolutionLineNames).some(name => {
                    const evolvedPokemon = POKEMON.find(pk => pk.name === name);
                    return evolvedPokemon && !isPokemonSafariExclusiveOnly(evolvedPokemon);
                });
                if (hasNonSafariEvolution) {
                    safariOnlyNames.push(evoPokemonObj.name);
                }
            }
        }
    }

    let messages = [];
    if (uncatchableNames.length > 0) {
        messages.push({ text: `Consider keeping, <span class="pokemon-note-name-highlight">${uncatchableNames.join(', ')}</span> cannot be caught in the wild.`, type: 'uncatchable' });
    }
    if (lureOnlyNames.length > 0) {
        messages.push({ text: `Note: <span class="pokemon-note-name-highlight">${lureOnlyNames.join(', ')}</span> is Lure-only. Consider keeping for evolving/breeding.`, type: 'lure-only' });
    }
    if (specialOnlyNames.length > 0) {
        messages.push({ text: `Note: <span class="pokemon-note-name-highlight">${specialOnlyNames.join(', ')}</span> is Special-only. Consider keeping for evolving/breeding.`, type: 'special-only' });
    }
    if (safariOnlyNames.length > 0) {
        messages.push({ text: `Note: <span class="pokemon-note-name-highlight">${safariOnlyNames.join(', ')}</span> is Safari-only.`, type: 'safari-only' });
    }
    // console.log(`generateEvolutionNotes: Generated messages for ${originalPokemon.name}:`, messages);
    return messages;
};

export const getPokemonNotes = (pokemonId, pokedexStatus) => {
    const notes = [];
    notes.push(...generateEvolutionNotes(pokemonId, pokedexStatus));
    return notes;
};

export const getEvolutionMessages = (pokemonId, pokedexStatus) => {
    return generateEvolutionNotes(pokemonId, pokedexStatus);
};