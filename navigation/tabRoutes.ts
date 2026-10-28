export const APP_TABS = [
    { key: 'Asosiy', name: 'Asosiy', nameKey: 'nav.home', defaultName: 'Asosiy', icon: 'home-outline', sfSymbol: 'house', selectedSymbol: 'house.fill' },
    { key: 'Turnirlar', name: 'Turnirlar', nameKey: 'nav.tournaments', defaultName: 'Turnirlar', icon: 'trophy-outline', sfSymbol: 'trophy', selectedSymbol: 'trophy.fill' },
    { key: 'Taqvim', name: 'Taqvim', nameKey: 'nav.calendar', defaultName: 'Taqvim', icon: 'calendar-outline', sfSymbol: 'calendar', selectedSymbol: 'calendar' },
    { key: 'Yangiliklar', name: 'Yangiliklar', nameKey: 'nav.news', defaultName: 'Yangiliklar', icon: 'newspaper-outline', sfSymbol: 'newspaper', selectedSymbol: 'newspaper.fill' },
    { key: 'Profil', name: 'Profil', nameKey: 'nav.profile', defaultName: 'Profil', icon: 'person-outline', sfSymbol: 'person.crop.circle', selectedSymbol: 'person.crop.circle.fill' },
] as const;

export type AppTabName = typeof APP_TABS[number]['name'];
export type AppTabParamList = { [Name in AppTabName]: undefined };

export function resolveAppTab(value: unknown): AppTabName | undefined {
    if (typeof value !== 'string') return undefined;
    return APP_TABS.find(tab => tab.name.toLowerCase() === value.toLowerCase())?.name;
}
