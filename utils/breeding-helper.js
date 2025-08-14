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
