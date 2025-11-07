import { IconButton, Tooltip, TooltipProps } from '@mui/material';
import { HelpOutline as HelpIcon } from '@mui/icons-material';

interface HelpTooltipProps {
  title: string;
  placement?: TooltipProps['placement'];
}

/**
 * Reusable help tooltip component with ? icon
 * Displays educational information on hover
 */
function HelpTooltip({ title, placement = 'right' }: HelpTooltipProps) {
  return (
    <Tooltip
      title={title}
      placement={placement}
      arrow
      enterDelay={200}
      leaveDelay={200}
      sx={{
        maxWidth: 400,
      }}
    >
      <IconButton size="small" sx={{ ml: 0.5, p: 0.5 }}>
        <HelpIcon fontSize="small" color="action" />
      </IconButton>
    </Tooltip>
  );
}

export default HelpTooltip;
