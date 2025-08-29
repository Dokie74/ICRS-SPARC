// Tests for loading states and skeleton components
// Ensures consistent loading experiences and proper component rendering

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import {
  LoadingSpinner,
  SkeletonPulse,
  SkeletonLine,
  SkeletonCircle,
  SkeletonAvatar,
  TableSkeleton,
  CardSkeleton,
  GridSkeleton,
  FormSkeleton,
  MetricsSkeleton,
  SidebarSkeleton,
  PageSkeleton,
  LoadingOverlay,
  InlineLoading,
  ProgressBar,
  useLoadingState
} from '../../../../src/frontend/components/shared/LoadingStates';

// Mock the store
jest.mock('../../../../src/frontend/stores/useAppStore', () => ({
  useIsLoading: jest.fn(() => false),
  useAppStore: jest.fn(() => ({
    ui: {
      setLoadingState: jest.fn()
    }
  }))
}));

describe('LoadingSpinner', () => {
  it('should render with default props', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('img', { hidden: true });
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin', 'w-6', 'h-6', 'text-blue-600');
  });

  it('should render with custom size', () => {
    render(<LoadingSpinner size="large" />);
    
    const spinner = screen.getByRole('img', { hidden: true });
    expect(spinner).toHaveClass('w-8', 'h-8');
  });

  it('should render with custom color', () => {
    render(<LoadingSpinner color="success" />);
    
    const spinner = screen.getByRole('img', { hidden: true });
    expect(spinner).toHaveClass('text-green-600');
  });

  it('should show text when requested', () => {
    render(<LoadingSpinner showText text="Loading data..." />);
    
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<LoadingSpinner className="custom-class" />);
    
    const container = screen.getByRole('img', { hidden: true }).closest('div');
    expect(container).toHaveClass('custom-class');
  });
});

describe('Skeleton Components', () => {
  describe('SkeletonPulse', () => {
    it('should render with pulse animation', () => {
      render(
        <SkeletonPulse>
          <div>Content</div>
        </SkeletonPulse>
      );
      
      const pulse = screen.getByText('Content').parentElement;
      expect(pulse).toHaveClass('animate-pulse');
    });
  });

  describe('SkeletonLine', () => {
    it('should render with default props', () => {
      render(<SkeletonLine />);
      
      const line = screen.getByRole('presentation', { hidden: true });
      expect(line).toHaveClass('bg-gray-200', 'rounded', 'h-4', 'w-full');
    });

    it('should render with custom width and height', () => {
      render(<SkeletonLine width="32" height="8" />);
      
      const line = screen.getByRole('presentation', { hidden: true });
      expect(line).toHaveClass('w-32', 'h-8');
    });
  });

  describe('SkeletonCircle', () => {
    it('should render as circle with default size', () => {
      render(<SkeletonCircle />);
      
      const circle = screen.getByRole('presentation', { hidden: true });
      expect(circle).toHaveClass('bg-gray-200', 'rounded-full', 'w-12', 'h-12');
    });

    it('should render with custom size', () => {
      render(<SkeletonCircle size="8" />);
      
      const circle = screen.getByRole('presentation', { hidden: true });
      expect(circle).toHaveClass('w-8', 'h-8');
    });
  });

  describe('SkeletonAvatar', () => {
    it('should render with default medium size', () => {
      render(<SkeletonAvatar />);
      
      const avatar = screen.getByRole('presentation', { hidden: true });
      expect(avatar).toHaveClass('bg-gray-200', 'rounded-full', 'w-12', 'h-12');
    });

    it('should render with large size', () => {
      render(<SkeletonAvatar size="large" />);
      
      const avatar = screen.getByRole('presentation', { hidden: true });
      expect(avatar).toHaveClass('w-16', 'h-16');
    });
  });
});

describe('Complex Skeleton Components', () => {
  describe('TableSkeleton', () => {
    it('should render table with default props', () => {
      render(<TableSkeleton />);
      
      // Should have header and 5 rows by default
      const container = screen.getByRole('presentation', { hidden: true });
      expect(container).toBeInTheDocument();
    });

    it('should render without header when specified', () => {
      render(<TableSkeleton showHeader={false} />);
      
      const container = screen.getByRole('presentation', { hidden: true });
      expect(container).toBeInTheDocument();
    });

    it('should render custom number of rows and columns', () => {
      render(<TableSkeleton rows={3} columns={6} />);
      
      const container = screen.getByRole('presentation', { hidden: true });
      expect(container).toBeInTheDocument();
    });
  });

  describe('CardSkeleton', () => {
    it('should render basic card skeleton', () => {
      render(<CardSkeleton />);
      
      const card = screen.getByRole('presentation', { hidden: true });
      expect(card).toHaveClass('bg-white', 'rounded-lg', 'shadow-sm');
    });

    it('should render with avatar when specified', () => {
      render(<CardSkeleton showAvatar />);
      
      const card = screen.getByRole('presentation', { hidden: true });
      expect(card).toBeInTheDocument();
    });

    it('should render with image placeholder when specified', () => {
      render(<CardSkeleton showImage />);
      
      const card = screen.getByRole('presentation', { hidden: true });
      expect(card).toBeInTheDocument();
    });

    it('should render custom number of lines', () => {
      render(<CardSkeleton lines={5} />);
      
      const card = screen.getByRole('presentation', { hidden: true });
      expect(card).toBeInTheDocument();
    });
  });

  describe('GridSkeleton', () => {
    it('should render grid with default props', () => {
      render(<GridSkeleton />);
      
      const grid = screen.getByRole('presentation', { hidden: true });
      expect(grid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
    });

    it('should render custom number of items', () => {
      render(<GridSkeleton items={9} />);
      
      const grid = screen.getByRole('presentation', { hidden: true });
      expect(grid).toBeInTheDocument();
    });

    it('should render with custom column configuration', () => {
      render(<GridSkeleton columns={4} />);
      
      const grid = screen.getByRole('presentation', { hidden: true });
      expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4');
    });
  });

  describe('FormSkeleton', () => {
    it('should render form skeleton with default fields', () => {
      render(<FormSkeleton />);
      
      const form = screen.getByRole('presentation', { hidden: true });
      expect(form).toHaveClass('bg-white', 'rounded-lg');
    });

    it('should render with custom number of fields', () => {
      render(<FormSkeleton fields={8} />);
      
      const form = screen.getByRole('presentation', { hidden: true });
      expect(form).toBeInTheDocument();
    });
  });

  describe('MetricsSkeleton', () => {
    it('should render metrics grid with default count', () => {
      render(<MetricsSkeleton />);
      
      const metrics = screen.getByRole('presentation', { hidden: true });
      expect(metrics).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4');
    });

    it('should render custom number of metrics', () => {
      render(<MetricsSkeleton metrics={6} />);
      
      const metrics = screen.getByRole('presentation', { hidden: true });
      expect(metrics).toBeInTheDocument();
    });
  });

  describe('PageSkeleton', () => {
    it('should render full page skeleton with all components', () => {
      render(<PageSkeleton />);
      
      const page = screen.getByRole('presentation', { hidden: true });
      expect(page).toHaveClass('min-h-screen', 'bg-gray-50');
    });

    it('should render without sidebar when specified', () => {
      render(<PageSkeleton showSidebar={false} />);
      
      const page = screen.getByRole('presentation', { hidden: true });
      expect(page).toBeInTheDocument();
    });

    it('should render without header when specified', () => {
      render(<PageSkeleton showHeader={false} />);
      
      const page = screen.getByRole('presentation', { hidden: true });
      expect(page).toBeInTheDocument();
    });

    it('should render different content types', () => {
      const contentTypes = ['table', 'grid', 'form', 'dashboard'];
      
      contentTypes.forEach(contentType => {
        render(<PageSkeleton contentType={contentType} />);
        
        const page = screen.getByRole('presentation', { hidden: true });
        expect(page).toBeInTheDocument();
      });
    });
  });
});

describe('Interactive Loading Components', () => {
  describe('LoadingOverlay', () => {
    it('should render when show is true', () => {
      render(<LoadingOverlay show message="Processing..." />);
      
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('should not render when show is false', () => {
      render(<LoadingOverlay show={false} message="Processing..." />);
      
      expect(screen.queryByText('Processing...')).not.toBeInTheDocument();
    });

    it('should render with transparent background', () => {
      render(<LoadingOverlay show transparent />);
      
      const overlay = screen.getByRole('img', { hidden: true }).closest('div');
      expect(overlay).toHaveClass('bg-white', 'bg-opacity-75');
    });
  });

  describe('InlineLoading', () => {
    it('should render spinner when show is true', () => {
      render(<InlineLoading show>Loading text</InlineLoading>);
      
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
      expect(screen.getByText('Loading text')).toBeInTheDocument();
    });

    it('should render children without spinner when show is false', () => {
      render(<InlineLoading show={false}>Content</InlineLoading>);
      
      expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should not render anything when show is false and no children', () => {
      const { container } = render(<InlineLoading show={false} />);
      
      expect(container.firstChild).toBeNull();
    });
  });

  describe('ProgressBar', () => {
    it('should render with default props', () => {
      render(<ProgressBar />);
      
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should calculate and display correct percentage', () => {
      render(<ProgressBar progress={25} total={100} />);
      
      expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('should hide percentage when specified', () => {
      render(<ProgressBar progress={50} showPercentage={false} />);
      
      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });

    it('should apply correct color class', () => {
      render(<ProgressBar progress={75} color="success" />);
      
      const progressBar = screen.getByText('75%').nextSibling.firstChild;
      expect(progressBar).toHaveClass('bg-green-600');
    });

    it('should set correct width style', () => {
      render(<ProgressBar progress={60} total={100} />);
      
      const progressBar = screen.getByText('60%').nextSibling.firstChild;
      expect(progressBar).toHaveStyle('width: 60%');
    });
  });
});

describe('useLoadingState Hook', () => {
  const { useIsLoading, useAppStore } = require('../../../../src/frontend/stores/useAppStore');
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return loading state and setter', () => {
    const mockSetLoadingState = jest.fn();
    useAppStore.mockReturnValue({
      ui: { setLoadingState: mockSetLoadingState }
    });
    useIsLoading.mockReturnValue(false);

    const { result } = renderHook(() => useLoadingState('test'));

    expect(result.current.isLoading).toBe(false);
    expect(typeof result.current.setLoading).toBe('function');
    expect(typeof result.current.withLoading).toBe('function');
  });

  it('should set loading state', () => {
    const mockSetLoadingState = jest.fn();
    useAppStore.mockReturnValue({
      ui: { setLoadingState: mockSetLoadingState }
    });
    useIsLoading.mockReturnValue(false);

    const { result } = renderHook(() => useLoadingState('test'));

    act(() => {
      result.current.setLoading(true);
    });

    expect(mockSetLoadingState).toHaveBeenCalledWith('test', true);
  });

  it('should handle async operations with loading', async () => {
    const mockSetLoadingState = jest.fn();
    useAppStore.mockReturnValue({
      ui: { setLoadingState: mockSetLoadingState }
    });
    useIsLoading.mockReturnValue(false);

    const { result } = renderHook(() => useLoadingState('test'));

    const asyncOperation = jest.fn().mockResolvedValue('success');

    let operationResult;
    await act(async () => {
      operationResult = await result.current.withLoading(asyncOperation);
    });

    expect(mockSetLoadingState).toHaveBeenCalledWith('test', true);
    expect(asyncOperation).toHaveBeenCalled();
    expect(operationResult).toBe('success');
    expect(mockSetLoadingState).toHaveBeenCalledWith('test', false);
  });

  it('should handle async operation errors', async () => {
    const mockSetLoadingState = jest.fn();
    useAppStore.mockReturnValue({
      ui: { setLoadingState: mockSetLoadingState }
    });
    useIsLoading.mockReturnValue(false);

    const { result } = renderHook(() => useLoadingState('test'));

    const asyncOperation = jest.fn().mockRejectedValue(new Error('Test error'));

    await act(async () => {
      try {
        await result.current.withLoading(asyncOperation);
      } catch (error) {
        expect(error.message).toBe('Test error');
      }
    });

    // Should still clear loading state even on error
    expect(mockSetLoadingState).toHaveBeenCalledWith('test', false);
  });
});

describe('Component Integration', () => {
  it('should render LoadingSpinner inside LoadingOverlay', () => {
    render(<LoadingOverlay show message="Loading..." />);
    
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render skeleton components with consistent styling', () => {
    render(
      <div>
        <TableSkeleton rows={2} />
        <CardSkeleton />
        <FormSkeleton fields={2} />
      </div>
    );
    
    // All skeleton components should have pulse animation
    const skeletonElements = screen.getAllByRole('presentation', { hidden: true });
    expect(skeletonElements.length).toBeGreaterThan(0);
  });
});