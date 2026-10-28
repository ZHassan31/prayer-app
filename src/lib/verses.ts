export interface Verse {
  /** Arabic text (public domain). */
  arabic: string;
  /** English rendering (Pickthall, 1930 — public domain). */
  english: string;
  /** Surah name and ayah number. */
  reference: string;
}

/**
 * A small rotating selection of short, well-known verses.
 *
 * Arabic text is public domain. The English is from Marmaduke Pickthall's
 * 1930 translation, which is also public domain — no copyrighted translation
 * is reproduced here.
 */
export const VERSES: Verse[] = [
  {
    arabic: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا',
    english: 'But lo! with hardship goeth ease.',
    reference: 'Ash-Sharh 94:5',
  },
  {
    arabic: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
    english: 'Verily in the remembrance of Allah do hearts find rest!',
    reference: "Ar-Ra'd 13:28",
  },
  {
    arabic: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ',
    english: 'And whosoever putteth his trust in Allah, He will suffice him.',
    reference: 'At-Talaq 65:3',
  },
  {
    arabic: 'لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا',
    english: 'Allah tasketh not a soul beyond its scope.',
    reference: 'Al-Baqarah 2:286',
  },
  {
    arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ',
    english: 'Therefore remember Me, I will remember you.',
    reference: 'Al-Baqarah 2:152',
  },
  {
    arabic: 'وَالَّذِينَ جَاهَدُوا فِينَا لَنَهْدِيَنَّهُمْ سُبُلَنَا',
    english:
      'And those who strive in Our cause, We will certainly guide them to Our paths.',
    reference: 'Al-Ankabut 29:69',
  },
  {
    arabic: 'قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ',
    english: 'Say: O My slaves who have been prodigal to their own hurt! Despair not of the mercy of Allah.',
    reference: 'Az-Zumar 39:53',
  },
];
