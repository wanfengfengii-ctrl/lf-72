import { useState, useCallback } from 'react';
import { Menu, X, List, Link, BarChart3 } from 'lucide-react';
import GraphCanvas from '@/components/graph/GraphCanvas';
import FragmentListPanel from '@/components/panels/FragmentListPanel';
import RelationListPanel from '@/components/panels/RelationListPanel';
import AnalysisPanel from '@/components/panels/AnalysisPanel';
import FragmentDialog from '@/components/dialogs/FragmentDialog';
import RelationDialog from '@/components/dialogs/RelationDialog';
import { useStore } from '@/store/useStore';

type RightPanelTab = 'relations' | 'analysis';

export default function App() {
  const { selectFragment, selectRelation, deleteFragment, deleteRelation } = useStore();

  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [rightTab, setRightTab] = useState<RightPanelTab>('analysis');

  const [fragmentDialogOpen, setFragmentDialogOpen] = useState(false);
  const [editingFragmentId, setEditingFragmentId] = useState<string | null>(null);

  const [relationDialogOpen, setRelationDialogOpen] = useState(false);
  const [editingRelationId, setEditingRelationId] = useState<string | null>(null);
  const [defaultSourceId, setDefaultSourceId] = useState<string | null>(null);
  const [defaultTargetId, setDefaultTargetId] = useState<string | null>(null);

  const handleAddFragment = useCallback(() => {
    setEditingFragmentId(null);
    setFragmentDialogOpen(true);
  }, []);

  const handleEditFragment = useCallback((id: string) => {
    setEditingFragmentId(id);
    setFragmentDialogOpen(true);
  }, []);

  const handleDeleteFragment = useCallback((id: string) => {
    deleteFragment(id);
  }, [deleteFragment]);

  const handleAddRelation = useCallback(() => {
    setEditingRelationId(null);
    setDefaultSourceId(null);
    setDefaultTargetId(null);
    setRelationDialogOpen(true);
  }, []);

  const handleEditRelation = useCallback((id: string) => {
    setEditingRelationId(id);
    setDefaultSourceId(null);
    setDefaultTargetId(null);
    setRelationDialogOpen(true);
  }, []);

  const handleDeleteRelation = useCallback((id: string) => {
    deleteRelation(id);
  }, [deleteRelation]);

  const handleNodeClick = useCallback((fragmentId: string) => {
    selectFragment(fragmentId);
  }, [selectFragment]);

  const handleEdgeClick = useCallback((relationId: string) => {
    selectRelation(relationId);
    setRightTab('relations');
  }, [selectRelation]);

  const handleConnect = useCallback((sourceId: string, targetId: string) => {
    setEditingRelationId(null);
    setDefaultSourceId(sourceId);
    setDefaultTargetId(targetId);
    setRelationDialogOpen(true);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-stone-100">
      <header className="h-14 bg-white border-b border-stone-200 flex items-center justify-between px-4 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            {leftPanelOpen ? <X className="w-5 h-5 text-stone-600" /> : <Menu className="w-5 h-5 text-stone-600" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
              <span className="text-white font-bold text-sm font-serif-sc">甲</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-stone-800 font-serif-sc">
                甲骨残片缀合研究系统
              </h1>
              <p className="text-xs text-stone-500 -mt-0.5">
                Oracle Bone Fragments Recombination System
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-stone-100 rounded-lg p-1">
            <button
              onClick={() => {
                setRightPanelOpen(true);
                setRightTab('relations');
              }}
              className={`
                px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors
                ${rightPanelOpen && rightTab === 'relations'
                  ? 'bg-white text-stone-800 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
                }
              `}
            >
              <Link className="w-4 h-4" />
              关系
            </button>
            <button
              onClick={() => {
                setRightPanelOpen(true);
                setRightTab('analysis');
              }}
              className={`
                px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors
                ${rightPanelOpen && rightTab === 'analysis'
                  ? 'bg-white text-stone-800 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
                }
              `}
            >
              <BarChart3 className="w-4 h-4" />
              分析
            </button>
          </div>
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            {rightPanelOpen ? <X className="w-5 h-5 text-stone-600" /> : <List className="w-5 h-5 text-stone-600" />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside
          className={`
            transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0
            ${leftPanelOpen ? 'w-72' : 'w-0'}
          `}
        >
          <div className="w-72 h-full">
            <FragmentListPanel
              onAddFragment={handleAddFragment}
              onEditFragment={handleEditFragment}
              onDeleteFragment={handleDeleteFragment}
            />
          </div>
        </aside>

        <main className="flex-1 relative min-w-0">
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-md px-4 py-2 border border-stone-200">
              <p className="text-xs text-stone-500">
                提示：拖拽节点调整位置，在节点间连线创建缀合关系
              </p>
            </div>
          </div>
          <GraphCanvas
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            onConnect={handleConnect}
          />
        </main>

        <aside
          className={`
            transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0
            ${rightPanelOpen ? 'w-80' : 'w-0'}
          `}
        >
          <div className="w-80 h-full flex flex-col">
            {rightTab === 'relations' ? (
              <RelationListPanel
                onAddRelation={handleAddRelation}
                onEditRelation={handleEditRelation}
                onDeleteRelation={handleDeleteRelation}
              />
            ) : (
              <AnalysisPanel
                onFragmentClick={(id) => selectFragment(id)}
                onRelationClick={(id) => selectRelation(id)}
              />
            )}
          </div>
        </aside>
      </div>

      <FragmentDialog
        isOpen={fragmentDialogOpen}
        onClose={() => setFragmentDialogOpen(false)}
        editFragmentId={editingFragmentId}
      />

      <RelationDialog
        isOpen={relationDialogOpen}
        onClose={() => setRelationDialogOpen(false)}
        editRelationId={editingRelationId}
        defaultSourceId={defaultSourceId}
        defaultTargetId={defaultTargetId}
      />
    </div>
  );
}
