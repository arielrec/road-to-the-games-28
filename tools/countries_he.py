#!/usr/bin/env python3
"""
Hebrew country names + short display names, keyed by IOC NOC code.

Needed by every country game and by the Odd One Out reveal. Short names matter as much
as the translation: "People's Republic of China" does not fit on a flag card, and
"Democratic People's Republic of Korea" fits nowhere.

Covers every NOC with >=25 medals all-time (the "recognisable" set that questions are
drawn from) plus the defunct states. Anything else falls back to its English name.
"""
HE = {
 'USA':('United States','ארצות הברית'),'GBR':('Great Britain','בריטניה'),
 'URS':('Soviet Union','ברית המועצות'),'FRA':('France','צרפת'),'GER':('Germany','גרמניה'),
 'CHN':('China','סין'),'ITA':('Italy','איטליה'),'AUS':('Australia','אוסטרליה'),
 'HUN':('Hungary','הונגריה'),'JPN':('Japan','יפן'),'SWE':('Sweden','שוודיה'),
 'RUS':('Russia','רוסיה'),'GDR':('East Germany','מזרח גרמניה'),'NED':('Netherlands','הולנד'),
 'CAN':('Canada','קנדה'),'ROU':('Romania','רומניה'),'KOR':('South Korea','דרום קוריאה'),
 'POL':('Poland','פולין'),'FIN':('Finland','פינלנד'),'CUB':('Cuba','קובה'),
 'SUI':('Switzerland','שווייץ'),'DEN':('Denmark','דנמרק'),'BUL':('Bulgaria','בולגריה'),
 'FRG':('West Germany','מערב גרמניה'),'ESP':('Spain','ספרד'),'BEL':('Belgium','בלגיה'),
 'NOR':('Norway','נורווגיה'),'BRA':('Brazil','ברזיל'),'GRE':('Greece','יוון'),
 'NZL':('New Zealand','ניו זילנד'),'UKR':('Ukraine','אוקראינה'),
 'TCH':('Czechoslovakia','צ׳כוסלובקיה'),'KEN':('Kenya','קניה'),'AUT':('Austria','אוסטריה'),
 'TUR':('Türkiye','טורקיה'),'EUN':('Unified Team','הנבחרת המאוחדת'),
 'RSA':('South Africa','דרום אפריקה'),'JAM':('Jamaica','ג׳מייקה'),'BLR':('Belarus','בלארוס'),
 'IRI':('Iran','איראן'),'KAZ':('Kazakhstan','קזחסטן'),'YUG':('Yugoslavia','יוגוסלביה'),
 'ARG':('Argentina','ארגנטינה'),'MEX':('Mexico','מקסיקו'),'ROC':('ROC','ועד אולימפי רוסי'),
 'CZE':('Czechia','צ׳כיה'),'ETH':('Ethiopia','אתיופיה'),'PRK':('North Korea','צפון קוריאה'),
 'AZE':('Azerbaijan','אזרביג׳ן'),'UZB':('Uzbekistan','אוזבקיסטן'),'CRO':('Croatia','קרואטיה'),
 'GEO':('Georgia','גאורגיה'),'IRL':('Ireland','אירלנד'),'TPE':('Chinese Taipei','טאיפה הסינית'),
 'IND':('India','הודו'),'THA':('Thailand','תאילנד'),'INA':('Indonesia','אינדונזיה'),
 'COL':('Colombia','קולומביה'),'EST':('Estonia','אסטוניה'),'EGY':('Egypt','מצרים'),
 'SVK':('Slovakia','סלובקיה'),'POR':('Portugal','פורטוגל'),'SLO':('Slovenia','סלובניה'),
 'MGL':('Mongolia','מונגוליה'),'LTU':('Lithuania','ליטא'),'SRB':('Serbia','סרביה'),
 'NGR':('Nigeria','ניגריה'),'MAR':('Morocco','מרוקו'),'ISR':('Israel','ישראל'),
 # further defunct / special NOCs that can appear in facts
 'SCG':('Serbia and Montenegro','סרביה ומונטנגרו'),'BOH':('Bohemia','בוהמיה'),
 'ANZ':('Australasia','אוסטרלאסיה'),'AHO':('Netherlands Antilles','האנטילים ההולנדיים'),
 'UAR':('United Arab Republic','הרפובליקה הערבית המאוחדת'),
 'WIF':('West Indies Federation','פדרציית הודו המערבית'),
 'EOR':('Refugee Team','נבחרת הפליטים'),'IOA':('Independent Athletes','ספורטאים עצמאיים'),
 'AIN':('Neutral Athletes','ספורטאים ניטרליים'),'KOS':('Kosovo','קוסובו'),
 'HKG':('Hong Kong','הונג קונג'),'TTO':('Trinidad and Tobago','טרינידד וטובגו'),
}
