import { Utils } from '../services/utils.service';

export class SearchQuery {

    private static YEAR_FROM = 1612;
    private static YEAR_TO = (new Date()).getFullYear();

    accessibility: string;
    query: string;
    page: number;
    ordering: string;

    keywords: string[] = [];
    authors: string[] = [];
    languages: string[] = [];
    locations: string[] = [];
    geonames: string[] = [];
    doctypes: string[] = [];
    collections: string[] = [];

    availableFilters: string[];

    from = -1;
    to = -1;

    solrConfig;

    constructor(filters: string[]) {
        this.availableFilters = filters || [];
    }

    public static fromParams(params, filters: string[]): SearchQuery {
        const query = new SearchQuery(filters);
        query.query = params['q'];
        query.setOrdering(params['sort']);
        query.setPage(params['page']);
        query.setFiled(query.keywords, 'keywords', params);
        query.setFiled(query.doctypes, 'doctypes', params);
        query.setFiled(query.authors, 'authors', params);
        query.setFiled(query.languages, 'languages', params);
        query.setFiled(query.locations, 'locations', params);
        query.setFiled(query.geonames, 'geonames', params);
        query.setFiled(query.collections, 'collections', params);
        if (query.availableFilters.indexOf('accessibility') > -1) {
            query.setAccessibility(params['accessibility']);
        }
        query.setYearRange(parseInt(params['from'], 10), parseInt(params['to'], 10));
        return query;
    }

    public static getSolrField(field): string {
        if (field === 'keywords') {
            return 'keywords';
        } else if (field === 'authors') {
            return 'facet_autor';
        } else if (field === 'doctypes') {
            return 'fedora.model';
        } else if (field === 'categories') {
            return 'document_type';
        } else if (field === 'languages') {
            return 'language';
        } else if (field === 'locations') {
            return 'mods.physicalLocation';
        } else if (field === 'geonames') {
            return 'geographic_names';
        } else if (field === 'collections') {
            return 'collection';
        } else if (field === 'accessibility') {
            return 'dostupnost';
        }
        return '';
    }


    public setAccessibility(accessibility: string) {
        if (accessibility === 'private') {
            this.accessibility = 'private';
        } else if (accessibility === 'public') {
            this.accessibility = 'public';
        } else {
            this.accessibility = 'all';
        }
    }

    public setYearRange(from: number, to: number) {
        if ((from || from === 0) && (to || to === 0)) {
            this.from = from;
            this.to = to;
        } else {
            this.clearYearRange();
        }
    }


    private clearYearRange() {
        this.from = SearchQuery.YEAR_FROM;
        this.to = SearchQuery.YEAR_TO;
    }

    private setFiled(fieldValues: string[], field: string, params) {
        const input = params[field];
        if (input && this.availableFilters.indexOf(field) > -1) {
            input.split(',,').forEach(function(a) {
                fieldValues.push(a);
            });
        }
    }

    public setOrdering(ordering: string) {
        if (ordering) {
            if (ordering === 'relevance' && !this.hasQueryString()) {
                this.ordering = 'newest';
            } else {
                this.ordering = ordering;
            }
        } else if (this.query) {
            this.ordering = 'relevance';
        } else {
            this.ordering = 'newest';
        }
    }

    public setPage(page) {
        let p = parseInt(page, 10);
        if (!p) {
            p = 1;
        }
        this.page = p;
    }

    getRows(): number {
        return 60;
    }

    getStart(): number {
        return 60 * (this.page - 1);
    }

    getRawQ() {
        if (!this.query || this.query === '*') {
            return null;
        }
        return  this.query;
    }

    getQ(): string {
        if (!this.query || this.query === '*') {
            return null;
        }
        let q = this.query;
        if (!Utils.inQuotes(q)) {
            q = q.trim(); // .replace(/:|\?|,|=|;|{|}|&|\[|\]|\[|!/g, ' ').replace(/-/g, '//-').replace(/\./g, '//.');
            while (q.indexOf('  ') > 0) {
                q = q.replace(/  /g, ' ');
            }
            // q = '("' + q + '" OR ' + q2 + ')';
            // q = q.split(' ').join(' AND ');
        }
        // q = q.replace(/"/g, '').replace(/-/g, '\\-');

        // if (q.indexOf(':') > -1 || q.indexOf('[') > -1 || q.indexOf(']') > -1 || q.indexOf('!') > -1) {
        //     q = '"' + q + '"';
        // }
        // if (q.startsWith('"') && q.endsWith('"')) {

        // } else {
        //     // q = q.replace(/ /g, '%2B');
        // }
        return q;
    }


    isYearRangeSet(): boolean {
        // console.log('isYearRangeSet');
        // console.log('this.from', this.from);
        return this.from !== SearchQuery.YEAR_FROM || this.to !== SearchQuery.YEAR_TO;
    }


    buildQuery(facet: string): string {
        const qString = this.getQ();
        let q = 'q=';
        if (qString) {
            q += '_query_:"{!edismax qf=\'dc.title^10 dc.creator^2 text^0.1 mods.shelfLocator\' bq=\'(level:0)^10\' bq=\'(dostupnost:public)^2\' v=$q1}\"';
            q += ' AND (fedora.model:monograph^5 OR fedora.model:periodical^5 OR fedora.model:soundrecording OR fedora.model:map OR fedora.model:graphic OR fedora.model:sheetmusic OR fedora.model:archive OR fedora.model:manuscript OR fedora.model:page OR fedora.model:article)';
        } else {
          q += '(fedora.model:monograph^5 OR fedora.model:periodical^5 OR fedora.model:soundrecording OR fedora.model:map OR fedora.model:graphic OR fedora.model:sheetmusic OR fedora.model:archive OR fedora.model:manuscript)';
        }
        if (facet !== 'accessibility' && this.availableFilters.indexOf('accessibility') > -1) {
            if (this.accessibility === 'public') {
                q += ' AND dostupnost:public';
            } else if (this.accessibility === 'private') {
                q += ' AND dostupnost:private';
            } else if (!facet) {
                // q += ' AND (dostupnost:public^999 OR dostupnost:private)';
            }
        }
        if (this.isYearRangeSet()) {
            const from = this.from === 0 ? 1 : this.from;
            q += ' AND (rok:[' + from + ' TO ' + this.to + '] OR (datum_begin:[* TO ' + this.to + '] AND datum_end:[' + from + ' TO *]))';
        }
        q += this.addToQuery('keywords', this.keywords, facet)
           + this.addToQuery('doctypes', this.doctypes, facet)
           + this.addToQuery('authors', this.authors, facet)
           + this.addToQuery('languages', this.languages, facet)
           + this.addToQuery('locations', this.locations, facet)
           + this.addToQuery('geonames', this.geonames, facet)
           + this.addToQuery('collections', this.collections, facet)
           + this.getDateOrderingRestriction();
        if (qString) {
            // q += '&defType=edismax'
            //    + '&qf=dc.title^10 dc.creator^2 keywords text^0.1'
            //    + '&bq=(level:0)^10&bq=(dostupnost:public)^2'
            q += '&q1=' + qString
               + '&fl=PID,dostupnost,model_path,dc.creator,root_title,root_pid,datum_str,img_full_mime,score'
               + '&group=true&group.field=root_pid&group.ngroups=true&group.sort=score desc';
            // if (environment.solr.facetTruncate) {
            q += '&group.truncate=true';
            //  } else {
            //    q += '&group.facet=true';
            //    }
        } else {
            q += '&fl=PID,dostupnost,fedora.model,dc.creator,dc.title,datum_str,img_full_mime';
        }
        q += '&facet=true&facet.mincount=1'
           + this.addFacetToQuery(facet, 'keywords', 'keywords', this.keywords.length === 0)
           + this.addFacetToQuery(facet, 'languages', 'language', this.languages.length === 0)
           + this.addFacetToQuery(facet, 'locations', 'mods.physicalLocation', this.locations.length === 0)
           + this.addFacetToQuery(facet, 'geonames', 'geographic_names', this.geonames.length === 0)
           + this.addFacetToQuery(facet, 'authors', 'facet_autor', this.authors.length === 0)
           + this.addFacetToQuery(facet, 'collections', 'collection', this.collections.length === 0)
           + this.addFacetToQuery(facet, 'doctypes', 'model_path', this.doctypes.length === 0)
           + this.addFacetToQuery(facet, 'accessibility', 'dostupnost', this.accessibility === 'all');
        if (facet) {
            q += '&rows=0';
        } else {
            const ordering = this.getOrderingValue();
            if (ordering) {
                q += '&sort=' + ordering;
            }
            q += '&rows=' + this.getRows() + '&start=' + this.getStart();
        }
        return q;
    }

    private addFacetToQuery(facet: string, currentFacet: string, field: string, apply: boolean): string {
        if (this.availableFilters.indexOf(currentFacet) > -1) {
            if ((!facet && apply) || currentFacet === facet) {
                return '&facet.field=' + field;
            }
        }
        return '';
    }

    toUrlParams() {
        const params = {};
        if (this.page && this.page > 1) {
            params['page'] = this.page;
        }
        if (this.accessibility === 'public' || this.accessibility === 'private') {
            params['accessibility'] = this.accessibility;
        }
        if (this.query) {
            params['q'] = this.query;
        }
        if (this.ordering) {
            params['sort'] = this.ordering;
        }
        if (this.keywords.length > 0) {
            params['keywords'] = this.keywords.join(',,');
        }
        if (this.authors.length > 0) {
            params['authors'] = this.authors.join(',,');
        }
        if (this.languages.length > 0) {
            params['languages'] = this.languages.join(',,');
        }
        if (this.locations.length > 0) {
            params['locations'] = this.locations.join(',,');
        }
        if (this.geonames.length > 0) {
            params['geonames'] = this.geonames.join(',,');
        }
        if (this.doctypes.length > 0) {
            params['doctypes'] = this.doctypes.join(',,');
        }
        if (this.collections.length > 0) {
            params['collections'] = this.collections.join(',,');
        }
        if (this.isYearRangeSet()) {
            params['from'] = this.from;
            params['to'] = this.to;
        }
        return params;
    }


    private getDateOrderingRestriction() {
        if (this.ordering === 'latest') {
            return ' AND datum_begin: [1 TO 3000]';
        } else if (this.ordering === 'earliest') {
            return ' AND datum_end: [1 TO 3000]';
        }
        return '';
    }


    public getOrderingValue(): string {
        if (this.ordering === 'newest') {
            return 'created_date desc';
        } else if (this.ordering === 'latest') {
           return 'datum_end desc';
        } else if (this.ordering === 'earliest') {
           return 'datum_begin asc';
        } else if (this.ordering === 'alphabetical') {
            if (this.getRawQ()) {
                return 'root_title asc';
            } else {
                return 'title_sort asc';
            }
        }
        return null;
    }


    private addToQuery(field, values, skip) {
        let q = '';
        if (skip !== field) {
            if (values.length > 0) {
                if (this.availableFilters.indexOf(field) > -1) {
                    if (field === 'doctypes' && this.hasQueryString()) {
                        q = ' AND (model_path:' + values.join('* OR model_path:') + '*)';
                    } else {
                        q = ' AND (' + SearchQuery.getSolrField(field) + ':"' + values.join('" OR ' + SearchQuery.getSolrField(field) + ':"') + '")';
                    }
                }
            }
        }
        return q;
    }

    public removeAllFilters() {
        this.accessibility = 'all';
        this.query = null;
        this.page = 1;
        this.keywords = [];
        this.doctypes = [];
        this.authors = [];
        this.collections = [];
        this.languages = [];
        this.locations = [];
        this.geonames = [];
        this.clearYearRange();
    }

    public hasQueryString() {
        if (this.query) {
            return true;
        }
        return false;
    }

    public anyFilter() {
        if (this.hasQueryString()) {
            return true;
        }
        if (this.accessibility && this.accessibility !== 'all') {
            return true;
        }
        if (this.keywords && this.keywords.length > 0) {
            return true;
        }
        if (this.doctypes && this.doctypes.length > 0) {
            return true;
        }
        if (this.authors && this.authors.length > 0) {
            return true;
        }
        if (this.languages && this.languages.length > 0) {
            return true;
        }
        if (this.locations && this.locations.length > 0) {
            return true;
        }
        if (this.geonames && this.geonames.length > 0) {
            return true;
        }
        if (this.collections && this.collections.length > 0) {
            return true;
        }
        if (this.isYearRangeSet()) {
            return true;
        }
        return false;
    }



}
