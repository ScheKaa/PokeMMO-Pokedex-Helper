import { getActiveProfileName } from './profile-manager.js';
import { POKEMON } from './pokemon.js';
import { displayMessageBox } from './ui-helper.js';

function formatLogTimestamp(timestampStr) {
    const cleanedStr = timestampStr.replace(/[\[\]]/g, '');
    const parts = cleanedStr.split(/[\s.:\/\\-]/);

    let month, day, year, time;

    if (parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 2) {
        const p1 = parseInt(parts[0], 10);
        const p2 = parseInt(parts[1], 10);

        if (p1 > 12 && p2 <= 12) { 
            day = parts[0];
            month = parts[1];
        } else if (p2 > 12 && p1 <= 12) { 
            month = parts[0];
            day = parts[1];
        } else { //
            day = parts[0];
            month = parts[1];
        }
        year = parts[2];
        time = `${parts[3]}:${parts[4]}:${parts[5]}`;
    } else {
        console.warn("Unexpected timestamp format:", timestampStr);
        return null; 
    }

    const fullYear = `20${year}`;
    return `${fullYear}-${month}-${day}T${time}.000`;
}

export async function processChatLog(chatLogContent) {
    const activeProfileName = getActiveProfileName().toLowerCase();
    const caughtPokemonEntries = [];
    let currentUserInBattle = null;

    const pokemonNames = new Set(POKEMON.map(p => p.name.toLowerCase()));

    const logEntryRegex = /(\[\d{2}[./-]\d{2}[./-]\d{2} \d{2}:\d{2}:\d{2}\])([\s\S]*?)(?=\[\d{2}[./-]\d{2}[./-]\d{2} \d{2}:\d{2}:\d{2}\]|$)/gs;
    let match;

    while ((match = logEntryRegex.exec(chatLogContent)) !== null) {
        const entryTimestampStr = match[1];
        const entryContent = match[2];
        const formattedTimestamp = formatLogTimestamp(entryTimestampStr);

        const sentOutMatch = entryContent.match(/\[Battle\] (.+?) sent out/i);
        if (sentOutMatch) {
            const battleUserName = sentOutMatch[1].replace(/\[#\w{6}\]|\[#\]/g, '').trim().toLowerCase();
            if (battleUserName === activeProfileName) {
                currentUserInBattle = activeProfileName;
            } else {
                currentUserInBattle = null;
            }
        }

        const pokedexEntryMatch = entryContent.match(/\[(.+?)\] \[(#\w{6})?\](.+?)\[#\]'s data was\s+added to the Pokédex\./is);
        if (pokedexEntryMatch && currentUserInBattle === activeProfileName) {
            const pokemonName = pokedexEntryMatch[3].trim();
            if (pokemonNames.has(pokemonName.toLowerCase())) {
                caughtPokemonEntries.push({ name: pokemonName, timestamp: formattedTimestamp });
            }
        }

        const evolutionMatch = entryContent.match(/evolved into (.+?)!/is);
        if (evolutionMatch && currentUserInBattle === activeProfileName) {
            const evolvedPokemonName = evolutionMatch[1].trim();
            const pokemon = POKEMON.find(p => p.name.toLowerCase() === evolvedPokemonName.toLowerCase());
            if (pokemon) {
                caughtPokemonEntries.push({ name: evolvedPokemonName, timestamp: formattedTimestamp });
            }
        }
    }
    return caughtPokemonEntries;
}

export async function confirmAndAddCaughtPokemon(newCaughtPokemon, pokedexStatus, savePokedexStatus, displayPokemon) {
    if (newCaughtPokemon.length === 0) {
        displayMessageBox("No new caught Pokémon found in the chat log for your profile.", "info");
        return;
    }

    const uniqueNewCaughtPokemon = new Map();
    newCaughtPokemon.forEach(entry => {
        const pokemon = POKEMON.find(p => p.name.toLowerCase() === entry.name.toLowerCase());
        if (pokemon) {
            const currentStatus = pokedexStatus[pokemon.id];
            if (!currentStatus || !currentStatus.caught) {
                uniqueNewCaughtPokemon.set(pokemon.id, {
                    id: pokemon.id,
                    name: pokemon.name,
                    caught: true,
                    timestamp: entry.timestamp
                });
            }
        }
    });

    if (uniqueNewCaughtPokemon.size === 0) {
        displayMessageBox("All found Pokémon are already caught or older than existing entries.", "info");
        return;
    }

    let updatedCount = 0;
    uniqueNewCaughtPokemon.forEach(entry => {
        const pokemonId = entry.id;

        if (!pokedexStatus[pokemonId] || !pokedexStatus[pokemonId].caught || (pokedexStatus[pokemonId].timestamp && new Date(entry.timestamp) > new Date(pokedexStatus[pokemonId].timestamp))) {
            pokedexStatus[pokemonId] = {
                id: entry.id,
                name: entry.name,
                caught: true,
                timestamp: entry.timestamp
            };
            updatedCount++;
            console.log(`Pokemon ${entry.name} added.`);
        } else {
            console.log(`Pokemon ${entry.name} not added (already caught with a newer or same timestamp).`);
        }
    });
    savePokedexStatus('pokedexStatus', pokedexStatus);
    displayPokemon();
    displayMessageBox(`${updatedCount} Pokémon added/updated in your Pokédex!`, "success");
    console.log("Pokédex update completed. Updated count:", updatedCount);
}
