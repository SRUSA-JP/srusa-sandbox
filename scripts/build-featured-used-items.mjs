import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync('data/data-registry.json', 'utf8'));
const sourcePath = config.paths.playerDataByDate;
const outputPath = config.paths.playerFeaturedUsedItems;
const featuredItems = config.featuredUsedItems;

function usedValue(snapshot, player, itemId) {
  return snapshot.players[player]?.stat_categories?.used?.[itemId] ?? 0;
}

function rankingFor(snapshot, itemId) {
  return Object.keys(snapshot.players)
    .map((player) => ({ player, value: usedValue(snapshot, player, itemId) }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value || a.player.localeCompare(b.player, 'ja'));
}

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const snapshot = source.snapshots.at(-1);

const items = Object.fromEntries(
  featuredItems.map(({ id, label, note }) => {
    const ranking = rankingFor(snapshot, id);
    return [
      id,
      {
        id,
        label,
        note,
        total: ranking.reduce((sum, entry) => sum + entry.value, 0),
        ranking,
      },
    ];
  }),
);

const dailyDeltas = source.snapshots.slice(1).map((current, index) => {
  const previous = source.snapshots[index];
  const players = new Set([...Object.keys(previous.players), ...Object.keys(current.players)]);
  return {
    from: previous.date,
    to: current.date,
    items: Object.fromEntries(
      featuredItems.map(({ id }) => [
        id,
        [...players]
          .map((player) => ({
            player,
            value: Math.max(0, usedValue(current, player, id) - usedValue(previous, player, id)),
          }))
          .filter((entry) => entry.value > 0)
          .sort((a, b) => b.value - a.value || a.player.localeCompare(b.player, 'ja')),
      ]),
    ),
  };
});

const output = {
  generated_on: source.generated_on,
  source: `${sourcePath} stat_categories.used`,
  snapshot: {
    date: snapshot.date,
    items,
  },
  daily_deltas: dailyDeltas,
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${outputPath} with ${featuredItems.length} ranking types.`);
