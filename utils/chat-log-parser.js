import { getActiveProfileName } from './profile-manager.js';
import { POKEMON } from './pokemon.js';
import { displayMessageBox } from './ui-helper.js';

function formatLogTimestamp(timestampStr) {
    const cleanedStr = timestampStr.replace(/[\[\]]/g, '');
    let parts = cleanedStr.split(/[. ]/);

    if (parts.length < 4) {
        console.error("Invalid timestamp format:", timestampStr);
        return null;
    }

    let p1 = parseInt(parts[0]);
    let p2 = parseInt(parts[1]);
    let yearShort = parts[2];
    let time = parts[3];

    let ampm = '';
    if (parts.length > 4) {
        ampm = parts[4].toUpperCase();
    }

    if (ampm) {
        let [hours, minutes, seconds] = time.split(':').map(Number);
        if (ampm === 'PM' && hours < 12) {
            hours += 12;
        }
        if (ampm === 'AM' && hours === 12) {
            hours = 0;
        }
        time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    const fullYear = `20${yearShort}`;

    const normalizedDateString1 = `${fullYear}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}T${time}`;
    const normalizedDateString2 = `${fullYear}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}T${time}`;

    const dateObj1 = new Date(normalizedDateString1); // DD.MM.YY format (European)
    const dateObj2 = new Date(normalizedDateString2); // MM.DD.YY format (American)

    const isValidDate = (d) => d instanceof Date && !isNaN(d.getTime());

    if (p1 > 12 && isValidDate(dateObj1)) {
        return normalizedDateString1 + ".000";
    } else if (p2 > 12 && isValidDate(dateObj2)) {
        return normalizedDateString2 + ".000";
    } else if (isValidDate(dateObj1)) {
        return normalizedDateString1 + ".000";
    } else if (isValidDate(dateObj2)) {
        return normalizedDateString2 + ".000";
    } else {
        console.error("Could not determine a valid date format for timestamp:", timestampStr);
        return null;
    }
}

export async function processChatLog(chatLogContent) {
    const activeProfileName = getActiveProfileName().toLowerCase();
    const caughtPokemonEntries = [];
    
    const pokemonNames = new Set(POKEMON.map(p => p.name.toLowerCase()));

    const logEntryRegex = /(\[\d{2}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2}( AM| PM)?\]|\[\d{1,2}\/\d{1,2}\/\d{2} \d{1,2}:\d{2}:\d{2} (AM|PM)\])([\s\S]*?)(?=(\[\d{2}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2}( AM| PM)?\]|\[\d{1,2}\/\d{1,2}\/\d{2} \d{1,2}:\d{2}:\d{2} (AM|PM)\])|$)/gs;
    let match;

    while ((match = logEntryRegex.exec(chatLogContent)) !== null) {
        const entryTimestampStr = match[1];
        const entryContent = match[2];
        const formattedTimestamp = formatLogTimestamp(entryTimestampStr);

        const loginMatch = entryContent.match(/\[System Announcements\] Welcome to PokeMMO! Enjoy your stay\./i);
        if (loginMatch) {
            awaitingInitialUserSentOut = true;
            currentLoggedInUser = null;
            currentUserInBattle = null;
            isNPCChallengeActive = false;
            continue;
        }

        const npcChallengeMatch = entryContent.match(/You are challenged by/i);
        if (npcChallengeMatch) {
            isNPCChallengeActive = true;
            continue;
        }

        const sentOutMatch = entryContent.match(/\[Battle\] (.+?) sent out/i);
        if (sentOutMatch) {
            const battleUserName = sentOutMatch[1].replace(/\[#\w{6}\]|\[#\]/g, '').trim().toLowerCase();

            if (awaitingInitialUserSentOut) {
                if (isNPCChallengeActive) {
                    isNPCChallengeActive = false;
                } else {
                    currentLoggedInUser = battleUserName;
                    awaitingInitialUserSentOut = false;
                }
            }
            
            if (currentLoggedInUser && battleUserName === currentLoggedInUser) {
                currentUserInBattle = currentLoggedInUser;
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
