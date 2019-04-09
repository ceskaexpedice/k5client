var APP_GLOBAL = {
  share_url: "http://kramerius5.nkp.cz/uuid/${UUID}",
  ga: 'UA-6683622-27',
  enablePeriodicalVolumesYearsLayout: true,
  enablePeriodicalIsssuesCalendarLayout: true,
  defaultPeriodicalVolumesLayout: "years", // grid | years
  defaultPeriodicalIssuesLayout: "calendar", // grid | calendar
  publicFilterDefault: false,
  dnnt: false,
  bigHomeLogo: true,
  aboutPage: {
    cs: '/assets/pages/nkp.about.cs.html',
    en: '/assets/pages/nkp.about.en.html',
  },
  krameriusList: [
    {
      title: 'Národní­ knihovna České republiky',
      code: 'nkp',
      logo: 'http://kramerius5.nkp.cz/logo.png',
      logoHome: 'http://kramerius5.nkp.cz/logo.png',
      url: 'http://kramerius5.nkp.cz',
      richCollections: false,
      joinedDoctypes: false,
      lemmatization: false,
      iiif: false,
      k3: 'http://kramerius.nkp.cz/kramerius/',
      doctypes: ['monograph', 'periodical', 'map', 'sheetmusic'],
      filters: ['accessibility', 'doctypes', 'authors', 'keywords', 'collections', 'languages']
    }
  ]

};
