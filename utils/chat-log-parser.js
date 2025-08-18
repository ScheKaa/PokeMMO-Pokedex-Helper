import { getActiveProfileName } from './profile-manager.js';
import { POKEMON } from './pokemon.js';
import { displayMessageBox } from './ui-helper.js';

function formatLogTimestamp(timestampStr) {
    const cleanedStr = timestampStr.replace(/[\[\]]/g, '');
    const parts = cleanedStr.split(/[. ]/);

    if (parts.length < 4) {
        console.error("Invalid timestamp format:", timestampStr);
        return null;
    }

    const [p1, p2, yearShort, time] = parts;
    const fullYear = `20${yearShort}`;

    // Normal People Date
    const dateString1 = `${fullYear}-${p2}-${p1}T${time}`;
    const dateObj1 = new Date(dateString1);

    // Americans...
    const dateString2 = `${fullYear}-${p1}-${p2}T${time}`;
    const dateObj2 = new Date(dateString2);

    const isValidDate = (d) => d instanceof Date && !isNaN(d.getTime());

    if (isValidDate(dateObj1) && isValidDate(dateObj2)) {

        const p1Int = parseInt(p1);
        const p2Int = parseInt(p2);

        if (p1Int > 12 && p2Int <= 12) {
            return dateString1 + ".000";
        } else if (p2Int > 12 && p1Int <= 12) {
            return dateString2 + ".000";
        } else {
            return dateString1 + ".000";
        }
    } else if (isValidDate(dateObj1)) {
        return dateString1 + ".000";
    } else if (isValidDate(dateObj2)) {
        return dateString2 + ".000";
    } else {
        console.error("Neither DD.MM.YY nor MM.DD.YY format was valid for timestamp:", timestampStr);
        return null;
    }
}

export async function processChatLog(chatLogContent) {
    const activeProfileName = getActiveProfileName().toLowerCase();
    const caughtPokemonEntries = [];
    let currentUserInBattle = null;

    const pokemonNames = new Set(POKEMON.map(p => p.name.toLowerCase()));

    const logEntryRegex = /(\[\d{2}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2}\])([\s\S]*?)(?=\[\d{2}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2}\]|$)/gs;
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
