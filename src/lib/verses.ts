export interface Verse {
  /** Arabic text (public domain). */
  arabic: string;
  /** English rendering (Pickthall, 1930 — public domain). */
  english: string;
  /** Surah name and ayah number. */
  reference: string;
}

/**
 * 100 short verses.
 *
 * Arabic text is public domain. The English is from Marmaduke Pickthall's
 * 1930 translation, which is also public domain — no copyrighted translation
 * is reproduced here.
 *
 * Kept short on purpose: the footer is a fixed-height box, so long passages
 * would be clamped. Every entry fits comfortably in two lines.
 *
 * NOTE: translations and references should be checked against a printed
 * Mushaf before public use. See README for details.
 */
export const VERSES: Verse[] = [
  { arabic: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا', english: 'But lo! with hardship goeth ease.', reference: 'Ash-Sharh 94:5' },
  { arabic: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ', english: 'Verily in the remembrance of Allah do hearts find rest!', reference: "Ar-Ra'd 13:28" },
  { arabic: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ', english: 'And whosoever putteth his trust in Allah, He will suffice him.', reference: 'At-Talaq 65:3' },
  { arabic: 'لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا', english: 'Allah tasketh not a soul beyond its scope.', reference: 'Al-Baqarah 2:286' },
  { arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ', english: 'Therefore remember Me, I will remember you.', reference: 'Al-Baqarah 2:152' },
  { arabic: 'وَالَّذِينَ جَاهَدُوا فِينَا لَنَهْدِيَنَّهُمْ سُبُلَنَا', english: 'And those who strive in Our cause, We will certainly guide them to Our paths.', reference: 'Al-Ankabut 29:69' },
  { arabic: 'قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ', english: 'Say: O My slaves who have been prodigal to their own hurt! Despair not of the mercy of Allah.', reference: 'Az-Zumar 39:53' },
  { arabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ', english: 'Lo! Allah is with the steadfast.', reference: 'Al-Baqarah 2:153' },
  { arabic: 'وَعَسَىٰ أَن تَكْرَهُوا شَيْئًا وَهُوَ خَيْرٌ لَّكُمْ', english: 'It may happen that ye hate a thing which is good for you.', reference: 'Al-Baqarah 2:216' },
  { arabic: 'إِنَّ اللَّهَ لَا يُحِبُّ الْمُعْتَدِينَ', english: 'Lo! Allah loveth not the aggressors.', reference: 'Al-Baqarah 2:190' },
  { arabic: 'وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ', english: 'Seek help in patience and prayer.', reference: 'Al-Baqarah 2:45' },
  { arabic: 'وَاللَّهُ يُحِبُّ الْمُحْسِنِينَ', english: 'Allah loveth the good.', reference: 'Al-Imran 3:134' },
  { arabic: 'وَاللَّهُ خَيْرُ الرَّازِقِينَ', english: 'Allah is the best of providers.', reference: 'Al-Jumuah 62:11' },
  { arabic: 'إِنَّ اللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتَّىٰ يُغَيِّرُوا مَا بِأَنفُسِهِمْ', english: 'Lo! Allah changeth not the condition of a folk until they change what is in their hearts.', reference: "Ar-Ra'd 13:11" },
  { arabic: 'وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ', english: 'My success cometh only by the help of Allah.', reference: 'Hud 11:88' },
  { arabic: 'إِنَّ اللَّهَ يَأْمُرُ بِالْعَدْلِ وَالْإِحْسَانِ', english: 'Lo! Allah enjoineth justice and kindness.', reference: 'An-Nahl 16:90' },
  { arabic: 'وَقُل رَّبِّ زِدْنِي عِلْمًا', english: 'And say: My Lord! Increase me in knowledge.', reference: 'Ta-Ha 20:114' },
  { arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي', english: 'My Lord! Relieve my mind.', reference: 'Ta-Ha 20:25' },
  { arabic: 'وَلَا تَمْشِ فِي الْأَرْضِ مَرَحًا', english: 'Walk not on the earth exultant.', reference: 'Al-Isra 17:37' },
  { arabic: 'وَقُل رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا', english: 'And say: My Lord! Have mercy on them both as they did care for me when I was little.', reference: 'Al-Isra 17:24' },
  { arabic: 'إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا', english: 'Lo! the prayer is a duty incumbent on the believers at fixed hours.', reference: 'An-Nisa 4:103' },
  { arabic: 'وَاللَّهُ غَفُورٌ رَّحِيمٌ', english: 'Allah is Forgiving, Merciful.', reference: 'Al-Baqarah 2:173' },
  { arabic: 'إِنَّ اللَّهَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ', english: 'Lo! Allah is Able to do all things.', reference: 'Al-Baqarah 2:20' },
  { arabic: 'وَلَا تَيْأَسُوا مِن رَّوْحِ اللَّهِ', english: 'Despair not of the Spirit of Allah.', reference: 'Yusuf 12:87' },
  { arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً', english: 'Our Lord! Give unto us in the world that which is good and in the Hereafter that which is good.', reference: 'Al-Baqarah 2:201' },
  { arabic: 'رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا', english: 'Our Lord! Cause not our hearts to stray after Thou hast guided us.', reference: 'Al-Imran 3:8' },
  { arabic: 'رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ', english: 'My Lord! Forgive me and my parents.', reference: 'Nuh 71:28' },
  { arabic: 'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ', english: 'Our Lord! Bestow on us from our spouses and our offspring comfort of our eyes.', reference: 'Al-Furqan 25:74' },
  { arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ', english: 'Allah is sufficient for us! Most Excellent is He in whom we trust.', reference: 'Al-Imran 3:173' },
  { arabic: 'لَا إِلَٰهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ', english: 'There is no deity save Thee! Be Thou glorified! Lo! I have been a wrong-doer.', reference: 'Al-Anbiya 21:87' },
  { arabic: 'وَمَا أَرْسَلْنَاكَ إِلَّا رَحْمَةً لِّلْعَالَمِينَ', english: 'We sent thee not save as a mercy for the peoples.', reference: 'Al-Anbiya 21:107' },
  { arabic: 'إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ', english: 'Lo! Allah and His angels shower blessings on the Prophet.', reference: 'Al-Ahzab 33:56' },
  { arabic: 'وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ', english: 'He is with you wheresoever ye may be.', reference: 'Al-Hadid 57:4' },
  { arabic: 'إِنَّ اللَّهَ لَا يُحِبُّ مَن كَانَ مُخْتَالًا فَخُورًا', english: 'Lo! Allah loveth not such as are proud and boastful.', reference: 'An-Nisa 4:36' },
  { arabic: 'وَأَن لَّيْسَ لِلْإِنسَانِ إِلَّا مَا سَعَىٰ', english: 'And that man hath only that for which he maketh effort.', reference: 'An-Najm 53:39' },
  { arabic: 'فَإِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ', english: 'Lo! Allah wasteth not the wage of the good.', reference: 'At-Tawbah 9:120' },
  { arabic: 'وَاللَّهُ مَعَ الصَّابِرِينَ', english: 'Allah is with the steadfast.', reference: 'Al-Baqarah 2:249' },
  { arabic: 'إِنَّ اللَّهَ سَمِيعٌ عَلِيمٌ', english: 'Lo! Allah is Hearer, Knower.', reference: 'Al-Baqarah 2:181' },
  { arabic: 'وَلَا تَقْرَبُوا الْفَوَاحِشَ', english: 'Come not near unto shameful deeds.', reference: 'Al-Anam 6:151' },
  { arabic: 'وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ', english: 'Establish worship and pay the poor-due.', reference: 'Al-Baqarah 2:43' },
  { arabic: 'إِنَّ اللَّهَ يُحِبُّ الْمُتَوَكِّلِينَ', english: 'Lo! Allah loveth those who put their trust in Him.', reference: 'Al-Imran 3:159' },
  { arabic: 'وَلَا تَقْتُلُوا أَنفُسَكُمْ', english: 'Kill not yourselves.', reference: 'An-Nisa 4:29' },
  { arabic: 'وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ', english: 'Help one another in righteousness and piety.', reference: 'Al-Maidah 5:2' },
  { arabic: 'إِنَّ اللَّهَ لَا يُحِبُّ الظَّالِمِينَ', english: 'Lo! Allah loveth not the wrong-doers.', reference: 'Al-Imran 3:57' },
  { arabic: 'وَاللَّهُ يَهْدِي مَن يَشَاءُ إِلَىٰ صِرَاطٍ مُّسْتَقِيمٍ', english: 'Allah guideth whom He will unto a straight path.', reference: 'Al-Baqarah 2:213' },
  { arabic: 'وَمَا خَلَقْتُ الْجِنَّ وَالْإِنسَ إِلَّا لِيَعْبُدُونِ', english: 'I created the jinn and humankind only that they might worship Me.', reference: 'Adh-Dhariyat 51:56' },
  { arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', english: 'Lo! with hardship goeth ease.', reference: 'Ash-Sharh 94:6' },
  { arabic: 'وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ', english: 'And verily thy Lord will give unto thee so that thou wilt be content.', reference: 'Ad-Duha 93:5' },
  { arabic: 'فَإِذَا فَرَغْتَ فَانصَبْ', english: 'So when thou art relieved, still toil.', reference: 'Ash-Sharh 94:7' },
  { arabic: 'وَرَبَّكَ فَكَبِّرْ', english: 'And thy Lord do thou magnify.', reference: 'Al-Muddaththir 74:3' },
  { arabic: 'وَالضُّحَىٰ وَاللَّيْلِ إِذَا سَجَىٰ', english: 'By the morning hours, and by the night when it is stillest.', reference: 'Ad-Duha 93:1-2' },
  { arabic: 'إِنَّ اللَّهَ لَا يَظْلِمُ مِثْقَالَ ذَرَّةٍ', english: 'Lo! Allah wrongeth not even of the weight of an ant.', reference: 'An-Nisa 4:40' },
  { arabic: 'وَلَا تَقُولَنَّ لِشَيْءٍ إِنِّي فَاعِلٌ ذَٰلِكَ غَدًا', english: 'Say not of a thing: Lo! I shall do that tomorrow.', reference: 'Al-Kahf 18:23' },
  { arabic: 'وَاذْكُر رَّبَّكَ إِذَا نَسِيتَ', english: 'Remember thy Lord when thou forgettest.', reference: 'Al-Kahf 18:24' },
  { arabic: 'إِنَّ اللَّهَ لَا يُحِبُّ الْمُسْرِفِينَ', english: 'Lo! Allah loveth not the prodigals.', reference: 'Al-Anam 6:141' },
  { arabic: 'وَلَا تَبْخَسُوا النَّاسَ أَشْيَاءَهُمْ', english: 'Wrong not mankind in their goods.', reference: 'Hud 11:85' },
  { arabic: 'وَأَوْفُوا الْكَيْلَ وَالْمِيزَانَ بِالْقِسْطِ', english: 'Give full measure and weight with equity.', reference: 'Al-Anam 6:152' },
  { arabic: 'إِنَّ اللَّهَ لَا يُحِبُّ الْفَرِحِينَ', english: 'Lo! Allah loveth not the exultant.', reference: 'Al-Qasas 28:76' },
  { arabic: 'وَلَا تَدْعُ مَعَ اللَّهِ إِلَٰهًا آخَرَ', english: 'Call not upon another god with Allah.', reference: 'Al-Qasas 28:88' },
  { arabic: 'كُلُّ نَفْسٍ ذَائِقَةُ الْمَوْتِ', english: 'Every soul will taste of death.', reference: 'Al-Ankabut 29:57' },
  { arabic: 'وَاللَّهُ يَرْزُقُ مَن يَشَاءُ بِغَيْرِ حِسَابٍ', english: 'Allah giveth without stint to whom He will.', reference: 'Al-Baqarah 2:212' },
  { arabic: 'وَلَا تَحْسَبَنَّ اللَّهَ غَافِلًا عَمَّا يَعْمَلُ الظَّالِمُونَ', english: 'Think not that Allah is unaware of what the wrong-doers do.', reference: 'Ibrahim 14:42' },
  { arabic: 'وَأَقِمِ الصَّلَاةَ لِذِكْرِي', english: 'Establish worship for My remembrance.', reference: 'Ta-Ha 20:14' },
  { arabic: 'إِنَّنِي أَنَا اللَّهُ لَا إِلَٰهَ إِلَّا أَنَا', english: 'Lo! I, even I, am Allah. There is no deity save Me.', reference: 'Ta-Ha 20:14' },
  { arabic: 'وَأْمُرْ أَهْلَكَ بِالصَّلَاةِ وَاصْطَبِرْ عَلَيْهَا', english: 'Enjoin prayer on thy people, and be constant therein.', reference: 'Ta-Ha 20:132' },
  { arabic: 'وَاصْبِرْ نَفْسَكَ مَعَ الَّذِينَ يَدْعُونَ رَبَّهُم بِالْغَدَاةِ وَالْعَشِيِّ', english: 'Restrain thyself along with those who cry unto their Lord at morn and evening.', reference: 'Al-Kahf 18:28' },
  { arabic: 'وَقُلِ الْحَقُّ مِن رَّبِّكُمْ', english: 'Say: The truth is from your Lord.', reference: 'Al-Kahf 18:29' },
  { arabic: 'فَمَن شَاءَ فَلْيُؤْمِن وَمَن شَاءَ فَلْيَكْفُرْ', english: 'So let him who will believe, and let him who will disbelieve.', reference: 'Al-Kahf 18:29' },
  { arabic: 'إِنَّا لَا نُضِيعُ أَجْرَ مَنْ أَحْسَنَ عَمَلًا', english: 'Lo! We suffer not the reward of one whose work is goodly to be lost.', reference: 'Al-Kahf 18:30' },
  { arabic: 'وَلَن تَجِدَ لِسُنَّةِ اللَّهِ تَبْدِيلًا', english: 'Thou wilt never find any change in the way of Allah.', reference: 'Al-Ahzab 33:62' },
  { arabic: 'وَاللَّهُ يُحِبُّ الصَّابِرِينَ', english: 'Allah loveth the steadfast.', reference: 'Al-Imran 3:146' },
  { arabic: 'وَلَا تَحْسَبَنَّ الَّذِينَ قُتِلُوا فِي سَبِيلِ اللَّهِ أَمْوَاتًا', english: 'Think not of those who are slain in the way of Allah as dead.', reference: 'Al-Imran 3:169' },
  { arabic: 'بَلْ أَحْيَاءٌ عِندَ رَبِّهِمْ يُرْزَقُونَ', english: 'Nay, they are living, finding their sustenance in the presence of their Lord.', reference: 'Al-Imran 3:169' },
  { arabic: 'وَاللَّهُ يَعْلَمُ مَا فِي قُلُوبِكُمْ', english: 'Allah knoweth what is in your hearts.', reference: 'Al-Ahzab 33:51' },
  { arabic: 'إِنَّ اللَّهَ كَانَ عَلِيمًا حَكِيمًا', english: 'Lo! Allah is ever Knower, Wise.', reference: 'An-Nisa 4:170' },
  { arabic: 'وَمَن يُطِعِ اللَّهَ وَرَسُولَهُ فَقَدْ فَازَ فَوْزًا عَظِيمًا', english: 'Whoso obeyeth Allah and His messenger, he verily hath gained a signal victory.', reference: 'Al-Ahzab 33:71' },
  { arabic: 'وَاللَّهُ غَفُورٌ حَلِيمٌ', english: 'Allah is Forgiving, Clement.', reference: 'Al-Baqarah 2:225' },
  { arabic: 'وَاللَّهُ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ', english: 'Allah is Able to do all things.', reference: 'Al-Baqarah 2:284' },
  { arabic: 'رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا', english: 'Our Lord! Hold us not to account if we forget or fall into error.', reference: 'Al-Baqarah 2:286' },
  { arabic: 'وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا', english: 'Pardon us, forgive us, and have mercy on us.', reference: 'Al-Baqarah 2:286' },
  { arabic: 'أَنتَ مَوْلَانَا فَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ', english: 'Thou art our Protecting Friend, therefore help us against the disbelieving folk.', reference: 'Al-Baqarah 2:286' },
  { arabic: 'لَا يُحِبُّ اللَّهُ الْجَهْرَ بِالسُّوءِ مِنَ الْقَوْلِ', english: 'Allah loveth not the utterance of harsh speech.', reference: 'An-Nisa 4:148' },
  { arabic: 'إِن تُبْدُوا خَيْرًا أَوْ تُخْفُوهُ أَوْ تَعْفُوا عَن سُوءٍ فَإِنَّ اللَّهَ كَانَ عَفُوًّا قَدِيرًا', english: 'If ye do good openly or keep it secret, or forgive evil, lo! Allah is ever Forgiving, Powerful.', reference: 'An-Nisa 4:149' },
  { arabic: 'وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ', english: 'And when My servants question thee concerning Me, then surely I am nigh.', reference: 'Al-Baqarah 2:186' },
  { arabic: 'أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ', english: 'I answer the prayer of the suppliant when he crieth unto Me.', reference: 'Al-Baqarah 2:186' },
  { arabic: 'وَلْيَسْتَجِيبُوا لِي وَلْيُؤْمِنُوا بِي لَعَلَّهُمْ يَرْشُدُونَ', english: 'So let them hear My call and let them trust in Me, in order that they may be led aright.', reference: 'Al-Baqarah 2:186' },
  { arabic: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا', english: 'And whosoever keepeth his duty to Allah, He will appoint a way out for him.', reference: 'At-Talaq 65:2' },
  { arabic: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مِنْ أَمْرِهِ يُسْرًا', english: 'And whosoever keepeth his duty to Allah, He will make his course easy for him.', reference: 'At-Talaq 65:4' },
  { arabic: 'فَاتَّقُوا اللَّهَ مَا اسْتَطَعْتُمْ', english: 'So keep your duty to Allah as much as ye can.', reference: 'At-Taghabun 64:16' },
  { arabic: 'وَأَطِيعُوا وَأَنفِقُوا خَيْرًا لِّأَنفُسِكُمْ', english: 'And obey and spend; that is better for your souls.', reference: 'At-Taghabun 64:16' },
  { arabic: 'وَمَن يُوقَ شُحَّ نَفْسِهِ فَأُولَٰئِكَ هُمُ الْمُفْلِحُونَ', english: 'And whoso is saved from his own greed, such are the successful.', reference: 'At-Taghabun 64:16' },
  { arabic: 'إِن تُقْرِضُوا اللَّهَ قَرْضًا حَسَنًا يُضَاعِفْهُ لَكُمْ', english: 'If ye lend unto Allah a goodly loan, He will double it for you.', reference: 'At-Taghabun 64:17' },
  { arabic: 'وَاللَّهُ شَاكِرٌ حَلِيمٌ', english: 'Allah is Responsive, Clement.', reference: 'At-Taghabun 64:17' },
  { arabic: 'سَبَّحَ لِلَّهِ مَا فِي السَّمَاوَاتِ وَالْأَرْضِ', english: 'All that is in the heavens and the earth glorifieth Allah.', reference: 'At-Taghabun 64:1' },
  { arabic: 'لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ', english: 'His is the Sovereignty and His the Praise, and He is Able to do all things.', reference: 'At-Taghabun 64:1' },
  { arabic: 'هُوَ الَّذِي خَلَقَكُمْ فَمِنكُمْ كَافِرٌ وَمِنكُم مُّؤْمِنٌ', english: 'He it is Who created you, but one of you is a disbeliever and one of you is a believer.', reference: 'At-Taghabun 64:2' },
  { arabic: 'وَاللَّهُ بِمَا تَعْمَلُونَ بَصِيرٌ', english: 'And Allah is Seer of what ye do.', reference: 'At-Taghabun 64:2' },
  { arabic: 'خَلَقَ السَّمَاوَاتِ وَالْأَرْضَ بِالْحَقِّ', english: 'He created the heavens and the earth with truth.', reference: 'At-Taghabun 64:3' },
  { arabic: 'وَصَوَّرَكُمْ فَأَحْسَنَ صُوَرَكُمْ', english: 'And He fashioned you and made your shapes perfect.', reference: 'At-Taghabun 64:3' },
  { arabic: 'إِلَيْهِ الْمَصِيرُ', english: 'Unto Him is the journeying.', reference: 'At-Taghabun 64:3' },
];
