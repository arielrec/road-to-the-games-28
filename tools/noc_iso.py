"""
IOC NOC code -> ISO 3166-1 alpha-2, for looking up flag files.

These two code systems disagree often and unguessably: GER not DE, SUI not CH,
NED not NL, RSA not ZA, KSA not SA, TPE not TW. Getting one wrong shows up as a
blank card mid-game, so tools/flags.py validates every NOC in medals.json against
this table and reports anything that fails to resolve.
"""
NOC_ISO = {
 'AFG':'af','AHO':None,'ALB':'al','ALG':'dz','AND':'ad','ANG':'ao','ANT':'ag','ARG':'ar',
 'ARM':'am','ARU':'aw','ASA':'as','AUS':'au','AUT':'at','AZE':'az','BAH':'bs','BAN':'bd',
 'BAR':'bb','BDI':'bi','BEL':'be','BEN':'bj','BER':'bm','BHU':'bt','BIH':'ba','BIZ':'bz',
 'BLR':'by','BOL':'bo','BOT':'bw','BRA':'br','BRN':'bh','BRU':'bn','BUL':'bg','BUR':'bf',
 'CAF':'cf','CAM':'kh','CAN':'ca','CAY':'ky','CGO':'cg','CHA':'td','CHI':'cl','CHN':'cn',
 'CIV':'ci','CMR':'cm','COD':'cd','COK':'ck','COL':'co','COM':'km','CPV':'cv','CRC':'cr',
 'CRO':'hr','CUB':'cu','CYP':'cy','CZE':'cz','DEN':'dk','DJI':'dj','DMA':'dm','DOM':'do',
 'ECU':'ec','EGY':'eg','ERI':'er','ESA':'sv','ESP':'es','EST':'ee','ETH':'et','FIJ':'fj',
 'FIN':'fi','FRA':'fr','FSM':'fm','GAB':'ga','GAM':'gm','GBR':'gb','GBS':'gw','GEO':'ge',
 'GEQ':'gq','GER':'de','GHA':'gh','GRE':'gr','GRN':'gd','GUA':'gt','GUI':'gn','GUM':'gu',
 'GUY':'gy','HAI':'ht','HKG':'hk','HON':'hn','HUN':'hu','INA':'id','IND':'in','IRI':'ir',
 'IRL':'ie','IRQ':'iq','ISL':'is','ISR':'il','ISV':'vi','ITA':'it','IVB':'vg','JAM':'jm',
 'JOR':'jo','JPN':'jp','KAZ':'kz','KEN':'ke','KGZ':'kg','KIR':'ki','KOR':'kr','KOS':'xk',
 'KSA':'sa','KUW':'kw','LAO':'la','LAT':'lv','LBA':'ly','LBR':'lr','LCA':'lc','LES':'ls',
 'LIB':'lb','LIE':'li','LTU':'lt','LUX':'lu','MAD':'mg','MAR':'ma','MAS':'my','MAW':'mw',
 'MDA':'md','MDV':'mv','MEX':'mx','MGL':'mn','MHL':'mh','MKD':'mk','MLI':'ml','MLT':'mt',
 'MNE':'me','MNT':'ms','MON':'mc','MOZ':'mz','MRI':'mu','MTN':'mr','MYA':'mm','NAM':'na',
 'NCA':'ni','NED':'nl','NEP':'np','NGR':'ng','NIG':'ne','NOR':'no','NRU':'nr','NZL':'nz',
 'OMA':'om','PAK':'pk','PAN':'pa','PAR':'py','PER':'pe','PHI':'ph','PLE':'ps','PLW':'pw',
 'PNG':'pg','POL':'pl','POR':'pt','PRK':'kp','PUR':'pr','QAT':'qa','ROU':'ro','RSA':'za',
 'RUS':'ru','RWA':'rw','SAM':'ws','SEN':'sn','SEY':'sc','SGP':'sg','SKN':'kn','SLE':'sl',
 'SLO':'si','SMR':'sm','SOL':'sb','SOM':'so','SRB':'rs','SRI':'lk','SSD':'ss','STP':'st',
 'SUD':'sd','SUI':'ch','SUR':'sr','SVK':'sk','SWE':'se','SWZ':'sz','SYR':'sy','TAN':'tz',
 'TGA':'to','THA':'th','TJK':'tj','TKM':'tm','TOG':'tg','TPE':'tw','TTO':'tt','TUN':'tn',
 'TUR':'tr','TUV':'tv','UAE':'ae','UGA':'ug','UKR':'ua','URU':'uy','USA':'us','UZB':'uz',
 'VAN':'vu','VEN':'ve','VIE':'vn','VIN':'vc','YEM':'ye','ZAM':'zm','ZIM':'zw',
}

# Defunct states whose flag is IDENTICAL to a modern one — no new asset needed,
# and both facts are interesting enough to surface in the app.
ALIAS = {
 'FRG':('de', 'West Germany used the plain black-red-gold tricolour'),
 'TCH':('cz', 'Czechia kept the Czechoslovak flag after the 1993 split'),
}

# Competed under the Olympic flag or a committee emblem, not a national flag.
# Kept in the medal data so totals stay correct; never used as a visual prompt.
NO_PROMPT = {
 'EUN':'Unified Team (1992)','ROC':'Russian Olympic Committee (2020)',
 'EOR':'Refugee Olympic Team','IOA':'Independent Olympic Athletes',
 'AIN':'Individual Neutral Athletes','ZZX':'Mixed teams','IOP':'Independent Participants',
}

# Historical flags that need a real source file. Any not supplied render as a
# name-only card — playable, because names are shown by default.
HISTORICAL = {
 'URS':('Soviet Union', 1952, 1988),
 'GDR':('East Germany', 1968, 1988),
 'ANZ':('Australasia', 1908, 1912),
 'AHO':('Netherlands Antilles', 1988, 1988),
 'WIF':('West Indies Federation', 1960, 1960),
 'YUG':('Yugoslavia', 1920, 1988),
 'SCG':('Serbia and Montenegro', 2004, 2004),
 'BOH':('Bohemia', 1900, 1912),
 'UAR':('United Arab Republic', 1960, 1960),
 'SAA':('Saar', 1952, 1952),
 'RU1':('Russian Empire', 1900, 1912),
}
