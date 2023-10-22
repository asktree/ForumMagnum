import React, { FC, RefObject, ReactElement, useEffect, useRef, useState } from 'react';
import { registerComponent, Components } from '../../lib/vulcan-lib';
import qs from 'qs';
import { RefinementListExposed, RefinementListProvided, SearchState } from 'react-instantsearch/connectors';
import { Hits, Configure, InstantSearch, SearchBox, Pagination, connectRefinementList, ToggleRefinement, NumericMenu, connectStats, ClearRefinements, connectScrollTo } from 'react-instantsearch-dom';
import { getSearchClient, AlgoliaIndexCollectionName, collectionIsAlgoliaIndexed, isSearchEnabled } from '../../lib/search/algoliaUtil';
import { useLocation, useNavigation } from '../../lib/routeUtil';
import { taggingNameIsSet, taggingNamePluralCapitalSetting, taggingNamePluralSetting } from '../../lib/instanceSettings';
import { Link } from '../../lib/reactRouterWrapper';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import InfoIcon from '@material-ui/icons/Info';
import Select from '@material-ui/core/Select';
import moment from 'moment';
import { useSearchAnalytics } from './useSearchAnalytics';
import {
  ElasticSorting,
  defaultElasticSorting,
  elasticCollectionIsCustomSortable,
  elasticSortingToUrlParam,
  formatElasticSorting,
  getElasticIndexNameWithSorting,
  getElasticSortingsForCollection,
  isValidElasticSorting,
} from '../../lib/search/elasticUtil';
import { communityPath } from '../../lib/routes';
import { showCommunityMapSetting } from '../../lib/publicSettings';

const hitsPerPage = 10

const styles = (theme: ThemeType): JssStyles => ({
  root: {
    width: "100%",
    maxWidth: 1200,
    display: 'flex',
    columnGap: 40,
    padding: '0 10px',
    margin: "auto",
    [theme.breakpoints.down('sm')]: {
      display: 'block',
      paddingTop: 24,
    }
  },
  filtersColumn: {
    flex: 'none',
    width: 250,
    fontFamily: theme.typography.fontFamily,
    color: theme.palette.grey[800],
    paddingTop: 12,
    [theme.breakpoints.down('sm')]: {
      display: 'none'
    },
    '& .ais-NumericMenu': {
      marginBottom: 26
    },
    '& .ais-NumericMenu-item': {
      marginTop: 5
    },
    '& .ais-NumericMenu-label': {
      display: 'flex',
      columnGap: 3
    },
    '& .ais-ToggleRefinement-label': {
      display: 'flex',
      columnGap: 6,
      alignItems: 'center',
      marginTop: 12
    },
    '& .ais-ClearRefinements': {
      color: theme.palette.primary.main,
      marginTop: 20
    },
    '& .ais-ClearRefinements-button--disabled': {
      display: 'none'
    },
  },
  filtersHeadline: {
    marginBottom: 18,
    fontWeight: 500,
    fontFamily: theme.palette.fonts.sansSerifStack,
    "&:not(:first-child)": {
      marginTop: 35,
    },
  },
  filterLabel: {
    fontSize: 14,
    color: theme.palette.grey[600],
    marginBottom: 6
  },
  mapLink: {
    color: theme.palette.primary.main,
    padding: 1,
    marginTop: 30
  },
  resultsColumn: {
    flex: '1 1 0',
  },
  searchIcon: {
    marginLeft: 12
  },
  searchBoxRow: {
    display: "flex",
    alignItems: "center",
    marginBottom: 15,
    gap: '16px',
    [theme.breakpoints.down('xs')]: {
      marginBottom: 12,
    },
  },
  searchInputArea: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    maxWidth: 625,
    height: 48,
    border: theme.palette.border.slightlyIntense2,
    borderRadius: 3,
    "& .ais-SearchBox": {
      display: 'inline-block',
      position: 'relative',
      width: '100%',
      marginLeft: 12,
      height: 46,
      whiteSpace: 'nowrap',
      boxSizing: 'border-box',
    },
    "& .ais-SearchBox-form": {
      height: '100%'
    },
    "& .ais-SearchBox-submit":{
      display: "none"
    },
    // This is a class generated by React InstantSearch, which we don't have direct control over so
    // are doing a somewhat hacky thing to style it.
    "& .ais-SearchBox-input": {
      height: "100%",
      width: "100%",
      paddingRight: 0,
      verticalAlign: "bottom",
      borderStyle: "none",
      boxShadow: "none",
      backgroundColor: "transparent",
      fontSize: 'inherit',
      "-webkit-appearance": "none",
      cursor: "text",
      ...theme.typography.body2,
    },
  },
  searchHelp: {
    [theme.breakpoints.down('sm')]: {
      display: "none",
    },
  },
  infoIcon: {
    fontSize: 20,
    fill: theme.palette.grey[800],
  },
  tabs: {
    margin: '0 auto 20px',
    '& .MuiTab-root': {
      minWidth: 110,
      [theme.breakpoints.down('xs')]: {
        minWidth: 50
      }
    },
    '& .MuiTab-labelContainer': {
      fontSize: '1rem'
    }
  },
  resultCount: {
    fontFamily: theme.typography.fontFamily,
    fontWeight: 400,
    fontSize: 14,
    color: theme.palette.grey[700],
    marginBottom: 20
  },
  sort: {
    borderRadius: theme.borderRadius.small,
    width: "100%",
  },
  pagination: {
    ...theme.typography.commentStyle,
    fontSize: 16,
    '& li': {
      padding: 8
    },
    '& .ais-Pagination-item': {
      color: theme.palette.primary.main,
    },
    '& .ais-Pagination-item--firstPage': {
      paddingLeft: 0
    },
    '& .ais-Pagination-item--page': {
      fontWeight: 600
    },
    '& .ais-Pagination-item--selected': {
      color: theme.palette.grey[900]
    },
    '& .ais-Pagination-item--disabled': {
      color: theme.palette.grey[500]
    }
  }
});

type ExpandedSearchState = SearchState & {
  contentType?: AlgoliaIndexCollectionName,
  refinementList?: {
    tags: Array<string>|''
  }
}

type TagsRefinementProps = {
  tagsFilter?: Array<string>,
  setTagsFilter?: Function
}

// filters by tags
const TagsRefinementList = ({ tagsFilter, setTagsFilter }:
  RefinementListProvided & TagsRefinementProps
) => {
  return <Components.TagMultiselect
    value={tagsFilter ?? []}
    path="tags"
    placeholder={`Filter by ${taggingNamePluralSetting.get()}`}
    hidePostCount
    startWithBorder
    updateCurrentValues={(values: {tags?: Array<string>}) => {
      setTagsFilter && setTagsFilter(values.tags)
    }}
  />
}
const CustomTagsRefinementList = connectRefinementList(TagsRefinementList) as React.ComponentClass<RefinementListExposed & TagsRefinementProps>

// shows total # of results
const Stats = ({ nbHits, className }: {
  nbHits: number,
  className: string
}) => {
  return <div className={className}>
    {nbHits} result{nbHits === 1 ? '' : 's'}
  </div>
}
const CustomStats = connectStats(Stats)

const ScrollTo: FC<{
  targetRef: RefObject<HTMLDivElement>,
  value: string,
  hasNotChanged: boolean,
  children: ReactElement,
}> = ({targetRef, value, hasNotChanged, children}) => {
  const prevValue = useRef(value);
  useEffect(() => {
    if (value !== prevValue.current && hasNotChanged) {
      targetRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }
    prevValue.current = value;
  }, [targetRef, value, hasNotChanged]);
  return children;
}
const CustomScrollTo = connectScrollTo(ScrollTo);

const SearchPageTabbed = ({classes}:{
  classes: ClassesType
}) => {
  const scrollToRef = useRef<HTMLDivElement>(null);
  const { history } = useNavigation()
  const { location, query } = useLocation()
  const captureSearch = useSearchAnalytics();

  // store these values for the search filter
  const pastDay = useRef(moment().subtract(24, 'hours').valueOf())
  const pastWeek = useRef(moment().subtract(7, 'days').valueOf())
  const pastMonth = useRef(moment().subtract(1, 'months').valueOf())
  const pastYear = useRef(moment().subtract(1, 'years').valueOf())

  // initialize the tab & search state from the URL
  const [tab, setTab] = useState<AlgoliaIndexCollectionName>(() => {
    const contentType = query.contentType as AlgoliaIndexCollectionName
    return collectionIsAlgoliaIndexed(contentType) ? contentType : 'Posts'
  })
  const [tagsFilter, setTagsFilter] = useState<Array<string>>(
    [query.tags ?? []].flatMap(tags => tags)
  )

  const {sort: initialSorting, ...initialSearchState} = qs.parse(location.search.slice(1));
  const [searchState, setSearchState] = useState<ExpandedSearchState>(initialSearchState);
  const [sorting, setSorting] = useState<ElasticSorting>(
    isValidElasticSorting(initialSorting) ? initialSorting : defaultElasticSorting,
  );

  const onSortingChange = (newSorting: string) => {
    if (!isValidElasticSorting(newSorting)) {
      throw new Error("Invalid algolia sorting: " + newSorting);
    }
    setSorting(newSorting);
    history.replace({
      ...location,
      search: qs.stringify({
        ...searchState,
        sort: elasticSortingToUrlParam(newSorting),
      }),
    });
  }

  const {
    ErrorBoundary, ExpandedUsersSearchHit, ExpandedPostsSearchHit, ExpandedCommentsSearchHit,
    ExpandedTagsSearchHit, ExpandedSequencesSearchHit, Typography, LWTooltip, MenuItem, ForumIcon
  } = Components;

  // we try to keep the URL synced with the search state
  const updateUrl = (search: ExpandedSearchState, tags: Array<string>) => {
    history.replace({
      ...location,
      search: qs.stringify({
        contentType: search.contentType,
        query: search.query,
        tags,
        toggle: search.toggle,
        page: search.page,
        sort: elasticSortingToUrlParam(sorting),
      })
    })
  }

  const handleChangeTab = (_: React.ChangeEvent, value: AlgoliaIndexCollectionName) => {
    setTab(value);
    setSorting(defaultElasticSorting);
    setSearchState({...searchState, contentType: value, page: 1});
  }
  // filters that we want to persist when changing content type tabs need to be handled separately
  // (currently that's just the tags filter)
  const handleUpdateTagsFilter = (tags: Array<string>) => {
    setTagsFilter(tags)
    updateUrl(searchState, tags)
  }
  
  const onSearchStateChange = (updatedSearchState: ExpandedSearchState) => {
    // clear tags filter if the tag refinements list is empty
    const clearTagFilters = updatedSearchState.refinementList?.tags === ''
    if (clearTagFilters)
      setTagsFilter([])
      
    updateUrl(updatedSearchState, clearTagFilters ? [] : tagsFilter)
    setSearchState(updatedSearchState)
  }

  useEffect(() => {
    if (searchState.query) {
      captureSearch("searchPageTabbed", searchState);
    }
  }, [searchState, captureSearch])

  useEffect(() => {
    if (query.query !== searchState?.query) {
      setSearchState((current) => ({
        ...current,
        page: "1",
        query: query.query,
      }));
    }
  }, [query.query, searchState?.query]);

  if (!isSearchEnabled()) {
    return <div className={classes.root}>
      Search is disabled (ElasticSearch not configured on server)
    </div>
  }
  
  // component for search results depends on which content type tab we're on
  const hitComponents = {
    'Posts': ExpandedPostsSearchHit,
    'Comments': ExpandedCommentsSearchHit,
    'Tags': ExpandedTagsSearchHit,
    'Sequences': ExpandedSequencesSearchHit,
    'Users': ExpandedUsersSearchHit
  }
  const HitComponent = hitComponents[tab]

  return <div className={classes.root}>
    <InstantSearch
      indexName={getElasticIndexNameWithSorting(tab, sorting)}
      searchClient={getSearchClient()}
      searchState={searchState}
      onSearchStateChange={onSearchStateChange}
    >
      <div className={classes.filtersColumn}>
        <Typography variant="headline" className={classes.filtersHeadline}>Filters</Typography>
        {['Posts', 'Comments', 'Sequences', 'Users'].includes(tab) && <>
          <div className={classes.filterLabel}>
            Filter by {tab === 'Users' ? 'joined' : 'posted'} date
          </div>
          <NumericMenu
            attribute="publicDateMs"
            items={[
              { label: 'All' },
              { label: 'Past 24 hours', start: pastDay.current },
              { label: 'Past week', start: pastWeek.current },
              { label: 'Past month', start: pastMonth.current },
              { label: 'Past year', start: pastYear.current },
            ]}
          />
        </>}
        {['Posts', 'Comments', 'Users'].includes(tab) && <CustomTagsRefinementList
            attribute="tags"
            defaultRefinement={tagsFilter}
            tagsFilter={tagsFilter}
            setTagsFilter={handleUpdateTagsFilter}
          />
        }
        {tab === 'Posts' && <ToggleRefinement
          attribute="curated"
          label="Curated"
          value={true}
        />}
        {tab === 'Posts' && <ToggleRefinement
          attribute="isEvent"
          label="Exclude events"
          value={false}
          defaultRefinement={true}
        />}
        {tab === 'Tags' && <ToggleRefinement
          attribute="core"
          label="Core topic"
          value={true}
        />}
        <ClearRefinements />

        {tab === 'Users' && showCommunityMapSetting.get() && <div className={classes.mapLink}>
          <Link to={`${communityPath}#individuals`}>View community map</Link>
        </div>}

        {elasticCollectionIsCustomSortable(tab) &&
          <>
            <Typography variant="headline" className={classes.filtersHeadline}>
              Sort
            </Typography>
            <Select
              value={sorting}
              onChange={(e) => onSortingChange(e.target.value)}
              className={classes.sort}
            >
              {getElasticSortingsForCollection(tab).map((name, i) =>
                <MenuItem key={i} value={name}>
                  {formatElasticSorting(name)}
                </MenuItem>
              )}
            </Select>
          </>
        }
      </div>

      <div className={classes.resultsColumn}>
        <div className={classes.searchBoxRow}>
          <div className={classes.searchInputArea}>
            <ForumIcon icon="Search" className={classes.searchIcon}/>
            {/* Ignored because SearchBox is incorrectly annotated as not taking null for its reset prop, when
              * null is the only option that actually suppresses the extra X button.
            // @ts-ignore */}
            <SearchBox defaultRefinement={query.query} reset={null} focusShortcuts={[]} autoFocus={true} />
          </div>
          <LWTooltip
            title={`"Quotes" and -minus signs are supported.`}
            className={classes.searchHelp}
          >
            <InfoIcon className={classes.infoIcon}/>
          </LWTooltip>
        </div>

        <div ref={scrollToRef} />

        <Tabs
          value={tab}
          onChange={handleChangeTab}
          className={classes.tabs}
          textColor="primary"
          aria-label="select content type to search"
          scrollable
          scrollButtons="off"
        >
          <Tab label="Posts" value="Posts" />
          <Tab label="Comments" value="Comments" />
          <Tab label={taggingNameIsSet.get() ? taggingNamePluralCapitalSetting.get() : 'Tags and Wiki'} value="Tags" />
          <Tab label="Sequences" value="Sequences" />
          <Tab label="Users" value="Users" />
        </Tabs>
        
        <ErrorBoundary>
          <Configure hitsPerPage={hitsPerPage} />
          <CustomStats className={classes.resultCount} />
          <CustomScrollTo targetRef={scrollToRef}>
            <Hits hitComponent={(props) => <HitComponent {...props} />} />
          </CustomScrollTo>
          <Pagination showLast className={classes.pagination} />
        </ErrorBoundary>
      </div>
    </InstantSearch>
  </div>
}

const SearchPageTabbedComponent = registerComponent("SearchPageTabbed", SearchPageTabbed, {styles})

declare global {
  interface ComponentTypes {
    SearchPageTabbed: typeof SearchPageTabbedComponent
  }
}
