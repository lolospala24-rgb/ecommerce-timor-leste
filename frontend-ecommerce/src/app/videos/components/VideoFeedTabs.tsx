// Shared feed-filter type — the switcher UI itself now lives in
// VideoTopBar (mobile/tablet overlay) and VideoSidebar (desktop rail),
// both of which drive this same type.
export type FeedTab = 'forYou' | 'following' | 'trending';
