import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import Card, { CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import Avatar, { AvatarGroup } from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { Plus } from 'lucide-react';

const Boards = () => {
  const [boards, setBoards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDesc, setNewBoardDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchBoards = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/boards');
      setBoards(response.data.boards);
    } catch (error) {
      console.error('Failed to fetch boards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) {
      setError('Board name is required');
      return;
    }
    setIsCreating(true);
    setError('');
    try {
      const response = await apiClient.post('/boards', { name: newBoardName, description: newBoardDesc });
      setBoards(prev => [response.data.board, ...prev]);
      setIsCreateModalOpen(false);
      setNewBoardName('');
      setNewBoardDesc('');
    } catch (err) {
      setError(err.message || 'Failed to create board');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-display text-primary tracking-tight">Boards</h1>
          <p className="text-small text-secondary mt-1">Manage your projects and workspaces.</p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Board
        </Button>
      </section>

      <section>
        {isLoading ? (
          <div className="text-small text-tertiary">Loading boards...</div>
        ) : boards.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg bg-surface">
            <h3 className="text-h3 text-primary mb-2">No boards yet</h3>
            <p className="text-body text-secondary mb-4">Create your first board to get started.</p>
            <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Board
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {boards.map(board => (
              <Card 
                key={board._id} 
                hoverable 
                className="flex flex-col h-full cursor-pointer"
                onClick={() => navigate(`/app/boards/${board._id}`)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="truncate">{board.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4">
                  <p className="text-small text-secondary line-clamp-3 min-h-[54px]">
                    {board.description || 'No description provided.'}
                  </p>
                </CardContent>
                <CardFooter className="justify-between bg-transparent border-t border-border pt-3 pb-3 mt-auto">
                  <AvatarGroup max={3}>
                    <Avatar name="Member" size="sm" />
                  </AvatarGroup>
                  <span className="text-[11px] text-tertiary">
                    {new Date(board.updatedAt).toLocaleDateString()}
                  </span>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Board"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateBoard} isLoading={isCreating}>
              Create Board
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <div className="text-small text-danger-500">{error}</div>}
          <div className="space-y-1">
            <label className="text-small text-primary font-medium">Board Name *</label>
            <Input 
              placeholder="e.g., Marketing Campaign" 
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              disabled={isCreating}
            />
          </div>
          <div className="space-y-1">
            <label className="text-small text-primary font-medium">Description</label>
            <textarea
              className="w-full bg-canvas border border-border rounded-md px-3 py-2 text-body text-primary focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed resize-y min-h-[80px]"
              placeholder="What is this board for?"
              value={newBoardDesc}
              onChange={(e) => setNewBoardDesc(e.target.value)}
              disabled={isCreating}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Boards;
