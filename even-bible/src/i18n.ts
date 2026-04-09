// App UI translations — add more languages here as needed.
// Book names (1-66) follow standard canonical order.

export type AppLang = 'en' | 'nl' | 'fr' | 'de' | 'es' | 'pt' | 'it' | 'pl';

export interface Strings {
  appLangTitle:  string;
  bibleLanguage: string;
  bibleVersion:  string;
  oldTestament:  string;
  newTestament:  string;
  loading:       string;
  books: Record<number, string>;
}

const EN_BOOKS: Record<number, string> = {
  1:'Genesis',2:'Exodus',3:'Leviticus',4:'Numbers',5:'Deuteronomy',
  6:'Joshua',7:'Judges',8:'Ruth',9:'1 Samuel',10:'2 Samuel',
  11:'1 Kings',12:'2 Kings',13:'1 Chronicles',14:'2 Chronicles',
  15:'Ezra',16:'Nehemiah',17:'Esther',18:'Job',19:'Psalms',
  20:'Proverbs',21:'Ecclesiastes',22:'Song of Solomon',23:'Isaiah',
  24:'Jeremiah',25:'Lamentations',26:'Ezekiel',27:'Daniel',
  28:'Hosea',29:'Joel',30:'Amos',31:'Obadiah',32:'Jonah',
  33:'Micah',34:'Nahum',35:'Habakkuk',36:'Zephaniah',
  37:'Haggai',38:'Zechariah',39:'Malachi',
  40:'Matthew',41:'Mark',42:'Luke',43:'John',44:'Acts',
  45:'Romans',46:'1 Corinthians',47:'2 Corinthians',48:'Galatians',
  49:'Ephesians',50:'Philippians',51:'Colossians',
  52:'1 Thessalonians',53:'2 Thessalonians',54:'1 Timothy',
  55:'2 Timothy',56:'Titus',57:'Philemon',58:'Hebrews',
  59:'James',60:'1 Peter',61:'2 Peter',62:'1 John',
  63:'2 John',64:'3 John',65:'Jude',66:'Revelation',
};

export const UI: Record<AppLang, Strings> = {

  en: {
    appLangTitle:  'App Language',
    bibleLanguage: 'Bible Language',
    bibleVersion:  'Bible Version',
    oldTestament:  'Old Testament',
    newTestament:  'New Testament',
    loading:       'Loading...',
    books: EN_BOOKS,
  },

  nl: {
    appLangTitle:  'App-taal',
    bibleLanguage: 'Bijbeltaal',
    bibleVersion:  'Bijbelversie',
    oldTestament:  'Oude Testament',
    newTestament:  'Nieuwe Testament',
    loading:       'Laden...',
    books: {
      1:'Genesis',2:'Exodus',3:'Leviticus',4:'Numeri',5:'Deuteronomium',
      6:'Jozua',7:'Richteren',8:'Ruth',9:'1 Samuël',10:'2 Samuël',
      11:'1 Koningen',12:'2 Koningen',13:'1 Kronieken',14:'2 Kronieken',
      15:'Ezra',16:'Nehemia',17:'Esther',18:'Job',19:'Psalmen',
      20:'Spreuken',21:'Prediker',22:'Hooglied',23:'Jesaja',
      24:'Jeremia',25:'Klaagliederen',26:'Ezechiël',27:'Daniël',
      28:'Hosea',29:'Joël',30:'Amos',31:'Obadja',32:'Jona',
      33:'Micha',34:'Nahum',35:'Habakuk',36:'Sefanja',
      37:'Haggai',38:'Zacharia',39:'Maleachi',
      40:'Mattheüs',41:'Markus',42:'Lukas',43:'Johannes',44:'Handelingen',
      45:'Romeinen',46:'1 Korinthiërs',47:'2 Korinthiërs',48:'Galaten',
      49:'Efeziërs',50:'Filippenzen',51:'Kolossenzen',
      52:'1 Thessalonicenzen',53:'2 Thessalonicenzen',54:'1 Timotheüs',
      55:'2 Timotheüs',56:'Titus',57:'Filemon',58:'Hebreeën',
      59:'Jakobus',60:'1 Petrus',61:'2 Petrus',62:'1 Johannes',
      63:'2 Johannes',64:'3 Johannes',65:'Judas',66:'Openbaring',
    },
  },

  fr: {
    appLangTitle:  'Langue de l\'app',
    bibleLanguage: 'Langue biblique',
    bibleVersion:  'Version de la Bible',
    oldTestament:  'Ancien Testament',
    newTestament:  'Nouveau Testament',
    loading:       'Chargement...',
    books: {
      1:'Genèse',2:'Exode',3:'Lévitique',4:'Nombres',5:'Deutéronome',
      6:'Josué',7:'Juges',8:'Ruth',9:'1 Samuel',10:'2 Samuel',
      11:'1 Rois',12:'2 Rois',13:'1 Chroniques',14:'2 Chroniques',
      15:'Esdras',16:'Néhémie',17:'Esther',18:'Job',19:'Psaumes',
      20:'Proverbes',21:'Ecclésiaste',22:'Cantique des Cantiques',23:'Ésaïe',
      24:'Jérémie',25:'Lamentations',26:'Ézéchiel',27:'Daniel',
      28:'Osée',29:'Joël',30:'Amos',31:'Abdias',32:'Jonas',
      33:'Michée',34:'Nahoum',35:'Habacuc',36:'Sophonie',
      37:'Aggée',38:'Zacharie',39:'Malachie',
      40:'Matthieu',41:'Marc',42:'Luc',43:'Jean',44:'Actes',
      45:'Romains',46:'1 Corinthiens',47:'2 Corinthiens',48:'Galates',
      49:'Éphésiens',50:'Philippiens',51:'Colossiens',
      52:'1 Thessaloniciens',53:'2 Thessaloniciens',54:'1 Timothée',
      55:'2 Timothée',56:'Tite',57:'Philémon',58:'Hébreux',
      59:'Jacques',60:'1 Pierre',61:'2 Pierre',62:'1 Jean',
      63:'2 Jean',64:'3 Jean',65:'Jude',66:'Apocalypse',
    },
  },

  de: {
    appLangTitle:  'App-Sprache',
    bibleLanguage: 'Bibelsprache',
    bibleVersion:  'Bibelversion',
    oldTestament:  'Altes Testament',
    newTestament:  'Neues Testament',
    loading:       'Laden...',
    books: {
      1:'1 Mose',2:'2 Mose',3:'3 Mose',4:'4 Mose',5:'5 Mose',
      6:'Josua',7:'Richter',8:'Ruth',9:'1 Samuel',10:'2 Samuel',
      11:'1 Könige',12:'2 Könige',13:'1 Chronik',14:'2 Chronik',
      15:'Esra',16:'Nehemia',17:'Esther',18:'Hiob',19:'Psalmen',
      20:'Sprüche',21:'Prediger',22:'Hohelied',23:'Jesaja',
      24:'Jeremia',25:'Klagelieder',26:'Ezechiel',27:'Daniel',
      28:'Hosea',29:'Joel',30:'Amos',31:'Obadja',32:'Jona',
      33:'Micha',34:'Nahum',35:'Habakuk',36:'Zefanja',
      37:'Haggai',38:'Sacharja',39:'Maleachi',
      40:'Matthäus',41:'Markus',42:'Lukas',43:'Johannes',44:'Apostelgeschichte',
      45:'Römer',46:'1 Korinther',47:'2 Korinther',48:'Galater',
      49:'Epheser',50:'Philipper',51:'Kolosser',
      52:'1 Thessalonicher',53:'2 Thessalonicher',54:'1 Timotheus',
      55:'2 Timotheus',56:'Titus',57:'Philemon',58:'Hebräer',
      59:'Jakobus',60:'1 Petrus',61:'2 Petrus',62:'1 Johannes',
      63:'2 Johannes',64:'3 Johannes',65:'Judas',66:'Offenbarung',
    },
  },

  es: {
    appLangTitle:  'Idioma de la app',
    bibleLanguage: 'Idioma bíblico',
    bibleVersion:  'Versión de la Biblia',
    oldTestament:  'Antiguo Testamento',
    newTestament:  'Nuevo Testamento',
    loading:       'Cargando...',
    books: {
      1:'Génesis',2:'Éxodo',3:'Levítico',4:'Números',5:'Deuteronomio',
      6:'Josué',7:'Jueces',8:'Rut',9:'1 Samuel',10:'2 Samuel',
      11:'1 Reyes',12:'2 Reyes',13:'1 Crónicas',14:'2 Crónicas',
      15:'Esdras',16:'Nehemías',17:'Ester',18:'Job',19:'Salmos',
      20:'Proverbios',21:'Eclesiastés',22:'Cantares',23:'Isaías',
      24:'Jeremías',25:'Lamentaciones',26:'Ezequiel',27:'Daniel',
      28:'Oseas',29:'Joel',30:'Amós',31:'Abdías',32:'Jonás',
      33:'Miqueas',34:'Nahúm',35:'Habacuc',36:'Sofonías',
      37:'Hageo',38:'Zacarías',39:'Malaquías',
      40:'Mateo',41:'Marcos',42:'Lucas',43:'Juan',44:'Hechos',
      45:'Romanos',46:'1 Corintios',47:'2 Corintios',48:'Gálatas',
      49:'Efesios',50:'Filipenses',51:'Colosenses',
      52:'1 Tesalonicenses',53:'2 Tesalonicenses',54:'1 Timoteo',
      55:'2 Timoteo',56:'Tito',57:'Filemón',58:'Hebreos',
      59:'Santiago',60:'1 Pedro',61:'2 Pedro',62:'1 Juan',
      63:'2 Juan',64:'3 Juan',65:'Judas',66:'Apocalipsis',
    },
  },

  pt: {
    appLangTitle:  'Idioma do app',
    bibleLanguage: 'Idioma bíblico',
    bibleVersion:  'Versão da Bíblia',
    oldTestament:  'Antigo Testamento',
    newTestament:  'Novo Testamento',
    loading:       'Carregando...',
    books: {
      1:'Gênesis',2:'Êxodo',3:'Levítico',4:'Números',5:'Deuteronômio',
      6:'Josué',7:'Juízes',8:'Rute',9:'1 Samuel',10:'2 Samuel',
      11:'1 Reis',12:'2 Reis',13:'1 Crônicas',14:'2 Crônicas',
      15:'Esdras',16:'Neemias',17:'Ester',18:'Jó',19:'Salmos',
      20:'Provérbios',21:'Eclesiastes',22:'Cantares',23:'Isaías',
      24:'Jeremias',25:'Lamentações',26:'Ezequiel',27:'Daniel',
      28:'Oséias',29:'Joel',30:'Amós',31:'Obadias',32:'Jonas',
      33:'Miquéias',34:'Naum',35:'Habacuque',36:'Sofonias',
      37:'Ageu',38:'Zacarias',39:'Malaquias',
      40:'Mateus',41:'Marcos',42:'Lucas',43:'João',44:'Atos',
      45:'Romanos',46:'1 Coríntios',47:'2 Coríntios',48:'Gálatas',
      49:'Efésios',50:'Filipenses',51:'Colossenses',
      52:'1 Tessalonicenses',53:'2 Tessalonicenses',54:'1 Timóteo',
      55:'2 Timóteo',56:'Tito',57:'Filemon',58:'Hebreus',
      59:'Tiago',60:'1 Pedro',61:'2 Pedro',62:'1 João',
      63:'2 João',64:'3 João',65:'Judas',66:'Apocalipse',
    },
  },

  it: {
    appLangTitle:  'Lingua dell\'app',
    bibleLanguage: 'Lingua della Bibbia',
    bibleVersion:  'Versione della Bibbia',
    oldTestament:  'Antico Testamento',
    newTestament:  'Nuovo Testamento',
    loading:       'Caricamento...',
    books: {
      1:'Genesi',2:'Esodo',3:'Levitico',4:'Numeri',5:'Deuteronomio',
      6:'Giosuè',7:'Giudici',8:'Rut',9:'1 Samuele',10:'2 Samuele',
      11:'1 Re',12:'2 Re',13:'1 Cronache',14:'2 Cronache',
      15:'Esdra',16:'Neemia',17:'Ester',18:'Giobbe',19:'Salmi',
      20:'Proverbi',21:'Ecclesiaste',22:'Cantico dei Cantici',23:'Isaia',
      24:'Geremia',25:'Lamentazioni',26:'Ezechiele',27:'Daniele',
      28:'Osea',29:'Gioele',30:'Amos',31:'Abdia',32:'Giona',
      33:'Michea',34:'Naum',35:'Abacuc',36:'Sofonia',
      37:'Aggeo',38:'Zaccaria',39:'Malachia',
      40:'Matteo',41:'Marco',42:'Luca',43:'Giovanni',44:'Atti',
      45:'Romani',46:'1 Corinzi',47:'2 Corinzi',48:'Galati',
      49:'Efesini',50:'Filippesi',51:'Colossesi',
      52:'1 Tessalonicesi',53:'2 Tessalonicesi',54:'1 Timoteo',
      55:'2 Timoteo',56:'Tito',57:'Filemone',58:'Ebrei',
      59:'Giacomo',60:'1 Pietro',61:'2 Pietro',62:'1 Giovanni',
      63:'2 Giovanni',64:'3 Giovanni',65:'Giuda',66:'Apocalisse',
    },
  },

  pl: {
    appLangTitle:  'Język aplikacji',
    bibleLanguage: 'Język Biblii',
    bibleVersion:  'Wersja Biblii',
    oldTestament:  'Stary Testament',
    newTestament:  'Nowy Testament',
    loading:       'Ładowanie...',
    books: {
      1:'Rodzaju',2:'Wyjścia',3:'Kapłańska',4:'Liczb',5:'Powtórzonego Prawa',
      6:'Jozuego',7:'Sędziów',8:'Rut',9:'1 Samuela',10:'2 Samuela',
      11:'1 Królewska',12:'2 Królewska',13:'1 Kronik',14:'2 Kronik',
      15:'Ezdrasza',16:'Nehemiasza',17:'Estery',18:'Hioba',19:'Psalmów',
      20:'Przysłów',21:'Kaznodziei',22:'Pieśni nad Pieśniami',23:'Izajasza',
      24:'Jeremiasza',25:'Lamentacje',26:'Ezechiela',27:'Daniela',
      28:'Ozeasza',29:'Joela',30:'Amosa',31:'Abdiasza',32:'Jonasza',
      33:'Micheasza',34:'Nahuma',35:'Habakuka',36:'Sofoniasza',
      37:'Aggeusza',38:'Zachariasza',39:'Malachiasza',
      40:'Mateusza',41:'Marka',42:'Łukasza',43:'Jana',44:'Dzieje Apostolskie',
      45:'Rzymian',46:'1 Koryntian',47:'2 Koryntian',48:'Galatów',
      49:'Efezjan',50:'Filipian',51:'Kolosan',
      52:'1 Tesaloniczan',53:'2 Tesaloniczan',54:'1 Tymoteusza',
      55:'2 Tymoteusza',56:'Tytusa',57:'Filemona',58:'Hebrajczyków',
      59:'Jakuba',60:'1 Piotra',61:'2 Piotra',62:'1 Jana',
      63:'2 Jana',64:'3 Jana',65:'Judy',66:'Objawienia',
    },
  },
};

// Native name shown in the app-language picker
export const APP_LANG_NAMES: Record<AppLang, string> = {
  en: 'English',
  nl: 'Nederlands',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  pt: 'Português',
  it: 'Italiano',
  pl: 'Polski',
};

export const APP_LANGS = Object.keys(APP_LANG_NAMES) as AppLang[];
