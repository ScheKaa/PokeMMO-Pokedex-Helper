export function exportPokemonData(pokemonCollection) {
    if (!pokemonCollection || pokemonCollection.length === 0) {
    alert("No Pokémon data to export.");
    return;
}

const dataStr = JSON.stringify(pokemonCollection, null, 2);
const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

const exportFileName = `pokemon_storage_${new Date().toISOString().slice(0, 10)}.json`;

const linkElement = document.createElement('a');
linkElement.setAttribute('href', dataUri);
linkElement.setAttribute('download', exportFileName);
linkElement.click();
linkElement.remove();
}

export function importPokemonData() {
return new Promise((resolve, reject) => {
    const inputElement = document.createElement('input');
    inputElement.type = 'file';
    inputElement.accept = '.json';

    inputElement.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) {
            reject(new Error("No file selected."));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (Array.isArray(importedData) && importedData.every(item => typeof item === 'object' && item !== null && 'id' in item && 'name' in item)) {
                    resolve(importedData);
                } else {
                    reject(new Error("Invalid JSON format. Please ensure it's a valid Pokémon collection JSON."));
                }
            } catch (error) {
                reject(new Error("Error parsing JSON file: " + error.message));
            }
        };
        reader.onerror = (error) => {
            reject(new Error("Error reading file: " + error.message));
        };
        reader.readAsText(file);
    };

    inputElement.click();
});
}
export function exportPokedexData(pokedexStatus) {
    if (!pokedexStatus || Object.keys(pokedexStatus).length === 0) {
        alert("No Pokedex data to export.");
        return;
    }

    const dataStr = JSON.stringify(pokedexStatus, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileName = `pokedex_status_${new Date().toISOString().slice(0, 10)}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
    linkElement.remove();
}

export function importPokedexData() {
    return new Promise((resolve, reject) => {
        const inputElement = document.createElement('input');
        inputElement.type = 'file';
        inputElement.accept = '.json';

        inputElement.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) {
                reject(new Error("No file selected."));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    if (typeof importedData !== 'object' || importedData === null || Array.isArray(importedData)) {
                        reject(new Error("Invalid Pokedex JSON format. Expected an object, not an array."));
                        return;
                    }

                    for (const key in importedData) {
                        const entry = importedData[key];
                        if (typeof entry !== 'object' || entry === null || !('id' in entry) || !('name' in entry) || !('caught' in entry) || String(entry.id) !== key) {
                            console.warn(`Pokedex import warning: Entry for key '${key}' does not match expected format or ID.`, entry);
                        }
                    }

                    resolve(importedData);
                } catch (error) {
                    reject(new Error("Error parsing JSON file: " + error.message));
                }
            };
            reader.onerror = (error) => {
                reject(new Error("Error reading file: " + error.message));
            };
            reader.readAsText(file);
        };

        document.body.appendChild(inputElement);
        inputElement.click();
        document.body.removeChild(inputElement);
    });
}
