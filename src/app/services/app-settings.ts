import { CollectionService } from './collection.service';
import { Injectable } from '@angular/core';

declare var APP_GLOBAL: any;

@Injectable()

export class AppSettings {

  public multiKramerius: boolean;
  public currentCode: string;

  public title: string;
  public logo: string;
  public url: string;
  public logoHome: string;
  public code: string;
  public richCollections: boolean;
  public joinedDoctypes: boolean;
  public doctypes: string[];
  public filters: string[];
  public lemmatization: boolean;
  public iiifEnabled: boolean;
  public k3: string;

  public share_url = APP_GLOBAL.share_url;
  public enablePeriodicalVolumesYearsLayout = APP_GLOBAL.enablePeriodicalVolumesYearsLayout;
  public enablePeriodicalIsssuesCalendarLayout = APP_GLOBAL.enablePeriodicalIsssuesCalendarLayout;
  public defaultPeriodicalVolumesLayout = APP_GLOBAL.defaultPeriodicalVolumesLayout;
  public defaultPeriodicalIsssuesLayout = APP_GLOBAL.defaultPeriodicalIssuesLayout;
  public publicFilterDefault = APP_GLOBAL.publicFilterDefault;
  public dnntEnabled = APP_GLOBAL.dnnt;
  public bigHomeLogo = APP_GLOBAL.bigHomeLogo;
  public aboutPage = APP_GLOBAL.aboutPage;
  public krameriusList: KrameriusData[];

  constructor(private collectionsService: CollectionService) {
    this.krameriusList = [];
    for (const k of APP_GLOBAL.krameriusList) {
      this.krameriusList.push(k);
    }
    this.multiKramerius = this.krameriusList.length > 1;
    this.assignKrameriusByIndex(0);
  }

  public assignKrameriusByCode(code: string): boolean {
    if (this.currentCode === code) {
      return true;
    }
    const k = this.findCrameriusByCode(code);
    if (k) {
      this.assignKramerius(k);
      return true;
    }
    return false;
  }

  private findCrameriusByCode(code: string): KrameriusData {
    for (const k of this.krameriusList) {
      if (k.code === code) {
        return k;
      }
    }
  }

  public assignKrameriusByIndex(index: number) {
    const k = this.krameriusList[index];
    this.assignKramerius(k);
  }

  public assignKramerius(kramerius: KrameriusData) {
    this.collectionsService.clear();
    this.code = kramerius.code;
    this.title = kramerius.title;
    this.url = kramerius.url;
    this.logo = kramerius.logo;
    this.richCollections = kramerius.richCollections;
    this.logoHome = kramerius.logoHome || this.logo;
    this.joinedDoctypes = kramerius.joinedDoctypes;
    this.doctypes = kramerius.doctypes;
    this.filters = kramerius.filters;
    this.lemmatization = kramerius.lemmatization;
    this.iiifEnabled = kramerius.iiif;
    this.k3 = kramerius.k3;
    this.currentCode = this.code;
  }

  public getLogoByCode(code: string): string {
    const k = this.findCrameriusByCode(code);
    if (k) {
      return k.logo;
    }
    return null;
  }

  public getUrlByCode(code: string): string {
    const k = this.findCrameriusByCode(code);
    if (k) {
      return k.url;
    }
    return null;
  }

  public getPathPrefix(): string {
    if (!this.multiKramerius) {
      return '';
    }
    return '/' + this.code;
  }

  public getRouteFor(path: string): string {
    return this.getPathPrefix() + '/' + path;
  }

  public availableFilter(filter: string): boolean {
    return this.filters.indexOf(filter) > -1;
  }

}


interface KrameriusData {
  code: string;
  title: string;
  logo: string;
  url: string;
  logoHome: string;
  richCollections: boolean;
  joinedDoctypes: boolean;
  doctypes: string[];
  filters: string[];
  lemmatization: boolean;
  iiif: boolean;
  k3: string;
}
