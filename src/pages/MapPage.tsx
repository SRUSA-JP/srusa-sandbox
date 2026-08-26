import { useCallback, useMemo, useRef, useState } from 'react';
import { AppLayout, Button, ChartCard, NoticePanel, Note, Picker, ProsePanel, TechnicalDetails } from '../components';
import { RELATIONSHIPS_CONTENT, builderSections, readerSections } from '../content';
import { playerPathForRelationshipPerson } from '../data/playerDb';
import { joinNotes } from '../lib/display';
import type { VizTheme } from '../theme/palette';
import { APP_TEXT, MAP_TEXT, TECHNICAL_TEXT } from '../config/messages';
import { RELATIONSHIP_MAP_DEFAULT_EDGE_MODE } from '../config/dataRegistry';
import { EDGE_MODES, ISSUE_PREVIEW_COUNT, LAYOUT_MODES, type EdgeMode, type LayoutMode } from '../map/config';
import { loadRelationshipData } from '../map/data';
import { groupTypeLabel, personLabel } from '../map/display';
import { buildLayout, withPositions } from '../map/layout';
import { parseRelationshipData } from '../map/parse';
import type { Point } from '../map/geometry';
import type { RelationshipData } from '../map/schema';
import { MapLegend } from '../components/organisms/MapLegend';
import { RelationshipMap } from '../components/organisms/RelationshipMap';
import { ACTIONS } from '../components/classes';

export interface MapPageProps {
  theme: VizTheme;
}

interface RelationshipWorkspaceExport {
  schemaVersion: 'srusa-relationship-workspace-v1';
  exportedAt: string;
  data: RelationshipData;
  layout: {
    positions: Record<string, Point>;
    centerPersonId: string;
    highlightedGroupId: string;
    edgeMode: EdgeMode;
    layoutMode?: LayoutMode;
    showTooltips?: boolean;
  };
}

type TooltipMode = 'on' | 'off';

const TOOLTIP_OPTIONS: Array<{ value: TooltipMode; label: string }> = [
  { value: 'on', label: MAP_TEXT.picker.tooltipOn },
  { value: 'off', label: MAP_TEXT.picker.tooltipOff },
];

function isPoint(value: unknown): value is Point {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Point).x === 'number' &&
    Number.isFinite((value as Point).x) &&
    typeof (value as Point).y === 'number' &&
    Number.isFinite((value as Point).y)
  );
}

function importedPositions(raw: unknown): Record<string, Point> {
  if (typeof raw !== 'object' || raw === null) return {};
  return Object.fromEntries(
    Object.entries(raw).filter((entry): entry is [string, Point] => isPoint(entry[1])),
  );
}

/** SRUSA の相関図の画面。 */
export function MapPage({ theme }: MapPageProps) {
  const source = useMemo(() => loadRelationshipData(), []);
  const [customData, setCustomData] = useState<RelationshipData | null>(null);
  const data = customData ?? source?.data ?? null;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [centerId, setCenterId] = useState(data?.view?.centerPersonId ?? data?.project.defaultCenterPersonId ?? '');
  const [highlightedGroupId, setHighlightedGroupId] = useState('');
  const [edgeMode, setEdgeMode] = useState<EdgeMode>(RELATIONSHIP_MAP_DEFAULT_EDGE_MODE);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('cluster');
  const [tooltipMode, setTooltipMode] = useState<TooltipMode>('on');
  const [importMessage, setImportMessage] = useState('');

  /*
   * 掴んで動かした人の座標。動かした人だけを持ち、それ以外は buildLayout の結果を使う。
   * 全員ぶんを持つと、データが増えたときに古い座標が残って追随しなくなる。
   */
  const [positions, setPositions] = useState<Record<string, Point>>({});

  const base = useMemo(() => (data ? buildLayout(data, layoutMode, centerId) : null), [centerId, data, layoutMode]);
  const layout = useMemo(() => (base ? withPositions(base, positions) : null), [base, positions]);

  const movePerson = useCallback((personId: string, x: number, y: number) => {
    setPositions((previous) => ({ ...previous, [personId]: { x, y } }));
  }, []);

  const changeLayoutMode = useCallback((mode: LayoutMode) => {
    setLayoutMode(mode);
    setPositions({});
  }, []);

  const exportWorkspace = useCallback(() => {
    if (!data) return;
    const payload: RelationshipWorkspaceExport = {
      schemaVersion: 'srusa-relationship-workspace-v1',
      exportedAt: new Date().toISOString(),
      data,
      layout: {
        positions,
        centerPersonId: centerId,
        highlightedGroupId,
        edgeMode,
        layoutMode,
        showTooltips: tooltipMode === 'on',
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `srusa-relationship-layout-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [centerId, data, edgeMode, highlightedGroupId, layoutMode, positions, tooltipMode]);

  const importWorkspace = useCallback(async (file: File) => {
    try {
      const raw = JSON.parse(await file.text()) as unknown;
      const wrapped = raw as Partial<RelationshipWorkspaceExport>;
      const candidate = wrapped.schemaVersion === 'srusa-relationship-workspace-v1' ? wrapped.data : raw;
      const parsed = parseRelationshipData(candidate);
      setCustomData(parsed.data);

      const nextPositions =
        wrapped.schemaVersion === 'srusa-relationship-workspace-v1'
          ? importedPositions(wrapped.layout?.positions)
          : {};
      const nextCenter =
        wrapped.schemaVersion === 'srusa-relationship-workspace-v1'
          ? wrapped.layout?.centerPersonId
          : parsed.data.view?.centerPersonId ?? parsed.data.project.defaultCenterPersonId;
      const fallbackCenter = parsed.data.project.defaultCenterPersonId || parsed.data.people[0]?.id || '';
      const validCenter = nextCenter && parsed.data.people.some((person) => person.id === nextCenter)
        ? nextCenter
        : fallbackCenter;
      const nextEdgeMode = wrapped.layout?.edgeMode;
      const nextLayoutMode = wrapped.layout?.layoutMode;
      const nextShowTooltips = wrapped.layout?.showTooltips;
      const validEdgeMode: EdgeMode =
        wrapped.schemaVersion === 'srusa-relationship-workspace-v1' &&
        EDGE_MODES.some((mode) => mode.value === nextEdgeMode)
          ? nextEdgeMode as EdgeMode
          : 'all';
      const validLayoutMode: LayoutMode =
        wrapped.schemaVersion === 'srusa-relationship-workspace-v1' &&
        LAYOUT_MODES.some((mode) => mode.value === nextLayoutMode)
          ? nextLayoutMode as LayoutMode
          : 'cluster';

      setPositions(nextPositions);
      setCenterId(validCenter);
      setHighlightedGroupId(
        wrapped.schemaVersion === 'srusa-relationship-workspace-v1'
          ? wrapped.layout?.highlightedGroupId ?? ''
          : '',
      );
      setEdgeMode(validEdgeMode);
      setLayoutMode(validLayoutMode);
      setTooltipMode(nextShowTooltips === false ? 'off' : 'on');
      setImportMessage(
        parsed.issues.length > 0
          ? `インポートしました。不整合 ${parsed.issues.length} 件を読み込み時に補正しています。`
          : 'インポートしました。',
      );
    } catch (error) {
      setImportMessage(error instanceof Error ? `インポートできませんでした: ${error.message}` : 'インポートできませんでした。');
    }
  }, []);

  const edges = useMemo(() => {
    if (!layout) return [];
    if (edgeMode === 'none') return [];
    if (edgeMode === 'center') {
      return layout.edges.filter(
        (edge) => edge.relation.source === centerId || edge.relation.target === centerId,
      );
    }
    return layout.edges;
  }, [layout, edgeMode, centerId]);

  if (!data || !layout) {
    return <Note tone="error">{MAP_TEXT.noData}</Note>;
  }

  const nameMode = data.project.nameMode;
  const peopleOptions = [...data.people]
    .sort((a, b) => personLabel(a, nameMode).localeCompare(personLabel(b, nameMode), 'ja'))
    .map((person) => ({ value: person.id, label: personLabel(person, nameMode) }));

  const groupOptions = [
    { value: '', label: MAP_TEXT.picker.noHighlight },
    ...layout.regions.map((region) => ({
      value: region.group.id,
      label: MAP_TEXT.picker.groupOption(
        region.group.name,
        groupTypeLabel(region.group.type),
        region.memberIds.length,
      ),
    })),
  ];

  const centerPerson = data.people.find((person) => person.id === centerId);

  return (
    <AppLayout
      title={data.project.name}
      note={MAP_TEXT.summary(
        data.people.length,
        layout.regions.length,
        data.relations.length,
        source?.version ?? '',
      )}
      lead={RELATIONSHIPS_CONTENT.lead}
      footnotes={
        RELATIONSHIPS_CONTENT.disclaimer ? (
          <NoticePanel title={APP_TEXT.disclaimer}>{RELATIONSHIPS_CONTENT.disclaimer}</NoticePanel>
        ) : undefined
      }
      technical={
        <TechnicalDetails title={TECHNICAL_TEXT.relationships.title} note={TECHNICAL_TEXT.relationships.note}>
          <section className="grid gap-xxs text-sm text-subtle">
            <h3 className="text-md font-medium text-heading">{TECHNICAL_TEXT.relationships.issues}</h3>
            {source && source.issues.length > 0 ? (
              <Note tone="error">
                {MAP_TEXT.issues(
                  source.issues.slice(0, ISSUE_PREVIEW_COUNT),
                  Math.max(0, source.issues.length - ISSUE_PREVIEW_COUNT),
                )}
              </Note>
            ) : (
              <span>{TECHNICAL_TEXT.relationships.noIssues}</span>
            )}
          </section>

          <section className="grid gap-sm text-sm text-subtle">
            <h3 className="text-md font-medium text-heading">{TECHNICAL_TEXT.relationships.io}</h3>
            <span>{TECHNICAL_TEXT.relationships.ioNote}</span>
            {importMessage && <Note>{importMessage}</Note>}
            <div className={ACTIONS}>
              <Button label={MAP_TEXT.action.exportLayout} icon="download" onClick={exportWorkspace} />
              <Button label={MAP_TEXT.action.importLayout} icon="upload" onClick={() => fileInputRef.current?.click()} />
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) void importWorkspace(file);
                  event.currentTarget.value = '';
                }}
              />
            </div>
          </section>

          <ProsePanel sections={builderSections(RELATIONSHIPS_CONTENT.sections)} />
        </TechnicalDetails>
      }
      footer={
        data.view?.notes && data.view.notes.length > 0 ? (
          <span>{data.view.notes.join(' / ')}</span>
        ) : undefined
      }
    >
        <ChartCard
          title={MAP_TEXT.card.map.title}
          note={joinNotes(
            MAP_TEXT.card.map.note,
            centerPerson && MAP_TEXT.card.map.center(personLabel(centerPerson, nameMode)),
          )}
          actions={
            <>
              <Picker
                showLabel
                label={MAP_TEXT.picker.center}
                value={centerId}
                options={peopleOptions}
                onChange={setCenterId}
              />
              <Picker
                showLabel
                label={MAP_TEXT.picker.group}
                value={highlightedGroupId}
                options={groupOptions}
                onChange={setHighlightedGroupId}
              />
              <Picker
                showLabel
                label={MAP_TEXT.picker.layout}
                value={layoutMode}
                options={LAYOUT_MODES.map((mode) => ({ value: mode.value, label: mode.label }))}
                onChange={changeLayoutMode}
              />
              <Picker
                showLabel
                label={MAP_TEXT.picker.edges}
                value={edgeMode}
                options={EDGE_MODES.map((mode) => ({ value: mode.value, label: mode.label }))}
                onChange={setEdgeMode}
              />
              <Picker
                showLabel
                label={MAP_TEXT.picker.tooltips}
                value={tooltipMode}
                options={TOOLTIP_OPTIONS}
                onChange={setTooltipMode}
              />
            </>
          }
        >
          <RelationshipMap
            layout={layout}
            theme={theme}
            centerId={centerId}
            highlightedGroupId={highlightedGroupId}
            edges={edges}
            nameMode={nameMode}
            profileHref={(placement) =>
              playerPathForRelationshipPerson(placement.person.id, placement.person.onlineName)
            }
            onMovePerson={movePerson}
            showTooltips={tooltipMode === 'on'}
            actions={
              Object.keys(positions).length > 0 ? (
                <Button
                  label={MAP_TEXT.resetPositions}
                  icon="reset"
                  onClick={() => setPositions({})}
                />
              ) : undefined
            }
          />
        </ChartCard>

        <ChartCard title={MAP_TEXT.card.legend.title} note={MAP_TEXT.card.legend.note}>
          <MapLegend
            regions={layout.regions}
            theme={theme}
            highlightedGroupId={highlightedGroupId}
            onHighlight={setHighlightedGroupId}
          />
        </ChartCard>

        <ProsePanel sections={readerSections(RELATIONSHIPS_CONTENT.sections)} />
    </AppLayout>
  );
}
