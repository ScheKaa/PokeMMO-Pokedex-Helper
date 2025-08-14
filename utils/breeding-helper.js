import { POKEMON } from './pokemon.js'
export function getEvolutionLine(pokemonId) {
  const visited = new Set();
  const queue = [pokemonId];
  while (queue.length) {
      const currentId = queue.shift();
      if (visited.has(currentId)) continue;
      
      const species = POKEMON.find(p => p.id === currentId);
      if (!species) continue;
      
      visited.add(currentId);
      
      [
          ...(species.evolutions || []).map(e => e.id),
          ...POKEMON
              .filter(p => p.evolutions?.some(e => e.id === currentId))
              .map(p => p.id)
      ].forEach(id => !visited.has(id) && queue.push(id));
  }
  
  return new Set([...visited].map(id => 
    POKEMON.find(p => p.id === id)?.name
  ).filter(Boolean));
}

export const getEvolutionMessages = (pokemonId) => {
    const uncatchableNames = [];
    const lureOnlyNames = [];
    const evolutionLineNames = getEvolutionLine(pokemonId);

    for (const evoName of evolutionLineNames) {
        const evoPokemonObj = POKEMON.find(p => p.name.toLowerCase() === evoName.toLowerCase());
        if (evoPokemonObj) {
            const locations = evoPokemonObj.locations || [];

            if (locations.length === 0 || locations.every(loc => loc.rarity === "Special")) {
                uncatchableNames.push(evoPokemonObj.name);
            }

            if (locations.length > 0) {
                const allRarities = new Set(locations.filter(loc => loc.rarity !== "Special").map(loc => loc.rarity));
                if (allRarities.size === 1 && allRarities.has("Lure")) {
                    lureOnlyNames.push(evoPokemonObj.name);
                }
            }
        }
    }

    const uniqueUncatchableNames = [...new Set(uncatchableNames)].sort();
    const uniqueLureOnlyNames = [...new Set(lureOnlyNames)].sort();

    const messages = [];
    if (uniqueUncatchableNames.length > 0) {
        messages.push(`Consider keeping, ${uniqueUncatchableNames.join(', ')} cannot be caught in the wild.`);
    }

    if (uniqueLureOnlyNames.length > 0) {
        messages.push(`Note: ${uniqueLureOnlyNames.join(', ')} is Lure-only. Consider keeping for evolving/breeding.`);
    }

    return messages;
};