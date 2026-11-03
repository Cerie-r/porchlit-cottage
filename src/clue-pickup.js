// A clue card collects itself: once one shows in an open drawer, box or book,
// it goes into the backpack, so it never has to be picked out of a small
// drawer by a careful tap. Only a card still unread and still where it was
// hidden; one read and put back by hand stays where it was put.
export const cluesShowing = (items, storageId, visible) => (items || []).filter(i =>
  i?.kind === 'note' && i.puzzleId && !i.opened && i.location === storageId && visible(i.slot));

// What the close-up says once they are in the backpack.
export const pickupWords = n => n > 1 ? `找到 ${n} 张线索卡` : '找到一张线索卡';
