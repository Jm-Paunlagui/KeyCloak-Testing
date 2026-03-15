import { faWarning } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// ============================================================================
// DESIGN SYSTEM - UPDATED COLOR PALETTE (CSS Custom Properties)
// ============================================================================
// Applied updated color guidelines from brand palette:
// Primary: AUMOVIO Orange (#FF4208) - 60% usage
// Secondary: AUMOVIO Purple (#4827AF) - 30% usage
// Accent Colors: Blue, Turquoise, Yellow, Grey - 10% usage
// Validation: Red (#d82822), Yellow (#ffd600), Green (#32cb70)
// Neutrals: White (#FFFFFF), Black (#000000), Grey variations
// ============================================================================

// ============================================================================
// CORE BRAND COLORS - Updated with New Brand Guidelines (No Gradients)
// ============================================================================
export const MAIN_STRONG_COLOR_BG = 'bg-[#FF4208] shadow-lg shadow-[#FF4208]/25';
export const MAIN_FOREGROUND_COLOR_BG = 'bg-[#FF4208]';
export const MAIN_OVERLAY_COLOR_BG = 'bg-[#FFFFFF] backdrop-blur-sm';
export const MAIN_PULSE_COLOR_BG = 'bg-[#FF4208]/15 animate-pulse';
export const BASE_COLOR_BG = 'bg-[#FFFFFF] bg-gradient-to-br from-[#FFFFFF] to-[#f0f0f0]';
export const GRADIENT_COLOR_BG = 'bg-gradient-to-br from-[#ff850a] via-[#FF4208] to-[#4827AF]';

export const MAIN_STRONG_COLOR_TEXT = 'text-[#FF4208] drop-shadow-sm';
export const MAIN_FOREGROUND_COLOR_TEXT = 'text-[#FF4208]/90 font-aumovio';
export const MAIN_OVERLAY_COLOR_TEXT = 'text-[#FFFFFF] drop-shadow-md';

// ============================================================================
// TYPOGRAPHY HIERARCHY - Applied Brand Colors
// ============================================================================
export const TITLE_COLOR_TEXT = 'text-[#000000] font-aumovio-bold tracking-tight';
export const SUBTITLE_COLOR_TEXT = 'text-[#000000]/75 font-aumovio';
export const BASE_COLOR_TEXT = 'text-[#000000]/85 font-normal leading-relaxed';
export const GRADIENT_COLOR_TEXT = 'text-[#FF4208] font-aumovio-bold tracking-wide drop-shadow-sm';
export const BASE_COLOR_TEXT_LIGHT = 'text-[#FFFFFF] font-normal leading-relaxed drop-shadow-sm';

// ============================================================================
// INTERACTIVE ELEMENTS - Updated with Brand Colors
// ============================================================================
export const TEXT_FIELD = `w-full p-2 font-aumovio-bold tracking-wider rounded-lg shadow-sm bg-[#FFFFFF]/95 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#FF4208]/40 focus:border-[#FF4208]/50 focus:shadow-md focus:shadow-[#FF4208]/10 transition-all duration-300`;

export const MAIN_COLOR = 'bg-[#FF4208] shadow-lg shadow-[#FF4208]/20';
export const SECONDARY_COLOR = 'bg-[#FF4208]/8 border border-[#FF4208]/20';
export const ACCENT_COLOR = 'bg-[#4827AF]/8 border border-[#4827AF]/25';

export const MAIN_COLOR_TEXT = 'text-[#000000]/80 font-aumovio';
export const SECONDARY_COLOR_TEXT = 'text-[#FFFFFF] font-aumovio drop-shadow-sm';
export const ACCENT_COLOR_TEXT = 'text-[#4827AF] font-aumovio-bold';
export const OPTIONS_COLOR_TEXT = 'text-[#FFFFFF] font-aumovio';
export const WARNING_COLOR_TEXT = 'text-[#d82822] font-aumovio-bold';

export const DELAY_1 = 'transition-all duration-300 ease-out delay-75';
export const DELAY_3 = 'transition-all duration-500 ease-out delay-150';
export const ICON_PLACE_SELF_CENTER = 'pr-2 place-self-center drop-shadow-sm';
export const ICON_PLACE_SELF_CENTER_1 = 'place-self-center drop-shadow-sm';

// ============================================================================
// ENHANCED BORDERS & EFFECTS - Updated with Brand Colors
// ============================================================================
export const STANDARD_BORDER = 'border border-[#787878]/40 shadow-sm';
export const SECONDARY_COLOR_BORDER = 'border border-[#4827AF]/20 shadow-sm';
export const ACCENT_COLOR_BORDER = 'border border-[#FF4208]/25 shadow-sm';

export const DEFAULT_BUTTON_TRANSITION = `${DELAY_3} border border-transparent rounded-lg hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg transition-all duration-300`;

// ============================================================================
// PREMIUM BUTTON VARIANTS - Applied Updated Brand Colors (No Gradients)
// ============================================================================
export const ACCENT_BUTTON = `font-aumovio-bold tracking-wide text-[#4827AF] bg-[#4827AF]/10 border border-[#4827AF]/20 hover:bg-[#4827AF] hover:text-[#FFFFFF] hover:border-transparent hover:shadow-xl hover:shadow-[#4827AF]/30 ${DEFAULT_BUTTON_TRANSITION}`;

export const DANGER_BUTTON = `font-aumovio-bold tracking-wide text-[#d82822] bg-[#f0d3dc] border border-[#d82822]/20 hover:bg-[#d82822] hover:text-[#FFFFFF] hover:border-transparent hover:shadow-xl hover:shadow-[#d82822]/30 ${DEFAULT_BUTTON_TRANSITION}`;

export const MAIN_BUTTON = `font-aumovio-bold tracking-wide text-[#FF4208] bg-[#FF4208]/10 border border-[#FF4208]/25 hover:bg-[#FF4208] hover:text-[#FFFFFF] hover:border-transparent hover:shadow-xl hover:shadow-[#FF4208]/30 ${DEFAULT_BUTTON_TRANSITION}`;

export const OPTIONS_BUTTON = `font-aumovio-bold tracking-wide text-[#000000]/80 bg-[#FF4208]/8 border border-[#FF4208]/20 hover:bg-[#FF4208] hover:text-[#FFFFFF] hover:border-transparent hover:shadow-xl hover:shadow-[#FF4208]/30 ${DEFAULT_BUTTON_TRANSITION}`;

// ============================================================================
// ENHANCED STATUS INDICATORS - Applied Updated Validation Colors (No Gradients)
// ============================================================================
export const STATUS_GREEN = 'font-aumovio-bold tracking-wide text-[#32cb70] bg-[#adebc6]/60 border border-[#32cb70]/30 rounded-lg shadow-sm';
export const STATUS_RED = 'font-aumovio-bold tracking-wide text-[#d82822] bg-[#f0d3dc] border border-[#d82822]/30 rounded-lg shadow-sm';
export const STATUS_WARNING = 'font-aumovio-bold tracking-wide text-[#ffd600] bg-[#ffee99]/20 border border-[#ffd600]/30 rounded-lg shadow-sm';
export const STATUS_BLUE = 'font-aumovio-bold tracking-wide text-[#18a9e7] bg-[#a3ddf5]/25 border border-[#18a9e7]/30 rounded-lg shadow-sm';
export const STATUS_PURPLE = 'font-aumovio-bold tracking-wide text-[#4827AF] bg-[#a08ae5]/28 border border-[#4827AF]/35 rounded-lg shadow-sm';
export const STATUS_CYAN = 'font-aumovio-bold tracking-wide text-[#12caae] bg-[#a1f7ea]/22 border border-[#12caae]/25 rounded-lg shadow-sm';
export const STATUS_VIOLET = 'font-aumovio-bold tracking-wide text-[#5c37d2] bg-[#a08ae5]/30 border border-[#5c37d2]/35 rounded-lg shadow-sm';
export const STATUS_FUCHSIA = 'font-aumovio-bold tracking-wide text-[#341c7d] bg-[#7e60dc]/32 border border-[#341c7d]/40 rounded-lg shadow-sm';
export const STATUS_AMBER = 'font-aumovio-bold tracking-wide text-[#cec43a] bg-[#ebe9b5] border border-[#cec43a]/30 rounded-lg shadow-sm';

// ============================================================================
// AREA/PERMISSION STATUS COLORS - Applied Updated Brand Guidelines (No Gradients)
// ============================================================================
export const AREA_COLORS = {
    INV_CON: 'font-aumovio-bold tracking-wide text-[#18a9e7] bg-[#a3ddf5] border border-[#18a9e7]/25 rounded-lg shadow-sm',
    INV_PPC: STATUS_AMBER,
    INV_UNIT: 'font-aumovio-bold tracking-wide text-[#4827AF] bg-[#a08ae5] border border-[#4827AF]/25 rounded-lg shadow-sm',
    INV_UNIT_SUP: 'font-aumovio-bold tracking-wide text-[#cec43a] bg-[#ebe9b5] border border-[#cec43a]/25 rounded-lg shadow-sm',
    INV_PROD: 'font-aumovio-bold tracking-wide text-[#12caae] bg-[#a1f7ea] border border-[#12caae]/25 rounded-lg shadow-sm',
    INV_ASSET: STATUS_BLUE,
    'VED PACK': STATUS_VIOLET,
    default: 'font-aumovio-bold tracking-wide text-[#FF4208] bg-[#FFB7A1]/20 border border-[#FF4208]/25 rounded-lg shadow-sm',
};

// ============================================================================
// SYSTEM HEALTH STATUS COLORS - Applied Updated Validation Colors
// ============================================================================
export const HEALTH_STATUS_COLORS = {
    healthy: 'text-[#32cb70] drop-shadow-sm',
    warning: 'text-[#ffd600] drop-shadow-sm',
    error: 'text-[#d82822] drop-shadow-sm',
    unknown: 'text-[#787878] drop-shadow-sm',
};

// ============================================================================
// STATUS COLOR VARIANTS - Applied Updated Brand Colors
// ============================================================================
export const STATUS_TEXT_COLORS = {
    green: 'text-[#32cb70] font-aumovio-bold',
    red: 'text-[#d82822] font-aumovio-bold',
    warning: 'text-[#ffd600] font-aumovio-bold',
    blue: 'text-[#18a9e7] font-aumovio-bold',
    purple: 'text-[#4827AF] font-aumovio-bold',
    cyan: 'text-[#12caae] font-aumovio-bold',
    violet: 'text-[#5c37d2] font-aumovio-bold',
    fuchsia: 'text-[#341c7d] font-aumovio-bold',
    amber: 'text-[#cec43a] font-aumovio-bold',
    turquoise: 'text-[#12caae] font-aumovio-bold',
    grey: 'text-[#787878] font-aumovio-bold',
};

export const STATUS_BG_COLORS = {
    green: 'bg-[#adebc6]/20 shadow-sm',
    red: 'bg-[#f0d3dc]/20 shadow-sm',
    warning: 'bg-[#ffee99]/20 shadow-sm',
    blue: 'bg-[#a3ddf5]/25 shadow-sm',
    purple: 'bg-[#a08ae5]/28 shadow-sm',
    cyan: 'bg-[#a1f7ea]/22 shadow-sm',
    violet: 'bg-[#a08ae5]/30 shadow-sm',
    fuchsia: 'bg-[#7e60dc]/32 shadow-sm',
    amber: 'bg-[#ebe9b5] shadow-sm',
    turquoise: 'bg-[#a1f7ea] shadow-sm',
    grey: 'bg-[#f0f0f0] shadow-sm',
};

export const STATUS_BORDER_COLORS = {
    green: 'border border-[#32cb70]/30',
    red: 'border border-[#d82822]/30',
    warning: 'border border-[#ffd600]',
    blue: 'border border-[#18a9e7]/30',
    purple: 'border border-[#4827AF]/35',
    cyan: 'border border-[#12caae]/25',
    violet: 'border border-[#5c37d2]/40',
    fuchsia: 'border border-[#341c7d]/40',
    amber: 'border border-[#cec43a]/30',
    turquoise: 'border border-[#12caae]/25',
    grey: 'border border-[#787878]/30',
};

// ============================================================================
// ACTION -> COLOR MAPPING
// Map common traceability action categories to a consistent set of
// status text/bg/border color classes so components can import a single
// mapping and render consistent badges/indicators.
// ============================================================================
export const ACTION_COLOR_MAP = {
    // imports and creations use the green (success) palette
    import: {
        text: STATUS_TEXT_COLORS.green,
        bg: STATUS_BG_COLORS.green,
        border: STATUS_BORDER_COLORS.green,
    },
    create: {
        text: STATUS_TEXT_COLORS.green,
        bg: STATUS_BG_COLORS.green,
        border: STATUS_BORDER_COLORS.green,
    },

    // retrievals use the blue palette
    retrieval: {
        text: STATUS_TEXT_COLORS.blue,
        bg: STATUS_BG_COLORS.blue,
        border: STATUS_BORDER_COLORS.blue,
    },

    // updates use the warning (amber/yellow) palette
    update: {
        text: STATUS_TEXT_COLORS.warning,
        bg: STATUS_BG_COLORS.warning,
        border: STATUS_BORDER_COLORS.warning,
    },

    // generic operations use the turquoise palette
    operation: {
        text: STATUS_TEXT_COLORS.turquoise,
        bg: STATUS_BG_COLORS.turquoise,
        border: STATUS_BORDER_COLORS.turquoise,
    },

    // authentication (sensitive) uses red
    authentication: {
        text: STATUS_TEXT_COLORS.red,
        bg: STATUS_BG_COLORS.red,
        border: STATUS_BORDER_COLORS.red,
    },

    // server functions / backend processes use cyan
    server: {
        text: STATUS_TEXT_COLORS.cyan,
        bg: STATUS_BG_COLORS.cyan,
        border: STATUS_BORDER_COLORS.cyan,
    },
};

export const DEFAULT_BUTTON = `font-aumovio-bold tracking-wide text-[#FFFFFF] drop-shadow-sm ${DEFAULT_BUTTON_TRANSITION}`;
export const CONTRAST = `font-aumovio-bold tracking-wide text-[#FF4208] drop-shadow-sm ${DEFAULT_BUTTON_TRANSITION}`;

export const WARNING_BUTTON = `font-aumovio-bold tracking-wide text-[#ffd600] bg-[#ffee99]/20 border border-[#ffd600]/30 hover:bg-[#ffee99]/20 hover:text-[#000000] hover:border-transparent hover:shadow-xl hover:shadow-[#ffd600]/30 ${DEFAULT_BUTTON_TRANSITION}`;

// ============================================================================
// ENHANCED FORM CONTROLS - Applied Updated Brand Colors (No Gradients)
// ============================================================================
export const PRIMARY_RADIO = `bg-[#FFFFFF] border border-[#4827AF]/30 shadow-sm cursor-pointer focus:outline-none hover:bg-[#a08ae5]/10 hover:shadow-md peer-checked:ring-2 peer-checked:ring-[#4827AF]/50 peer-checked:text-[#4827AF] peer-checked:bg-[#a08ae5]/15 peer-checked:border-[#4827AF] peer-checked:shadow-lg ${DEFAULT_BUTTON_TRANSITION}`;

export const DANGER_RADIO = `bg-[#FFFFFF] border border-[#d82822]/30 rounded-lg shadow-sm cursor-pointer focus:outline-none hover:bg-[#f0d3dc]/70 hover:shadow-md peer-checked:ring-2 peer-checked:ring-[#d82822]/50 peer-checked:text-[#d82822] peer-checked:bg-[#f0d3dc] peer-checked:border-[#d82822] peer-checked:shadow-lg ${DEFAULT_BUTTON_TRANSITION}`;

// ============================================================================
// FORM VALIDATION STYLES - Applied Updated Validation Colors (No Gradients)
// ============================================================================
export const INPUT_ERROR = 'outline-[#d82822] placeholder-[#d82822]/70 text-[#d82822] bg-[#f0d3dc]/20 border-[#d82822]/50';
export const ERROR_MESSAGE = 'font-aumovio-bold text-[#d82822] bg-[#f0d3dc] border border-[#d82822]/30 rounded-lg p-4 wrap-break-word shadow-sm';
export const SUCCESS_MESSAGE = 'font-aumovio-bold text-[#32cb70] bg-[#adebc6] border border-[#32cb70]/30 rounded-lg shadow-sm';
export const WARNING_MESSAGE = 'font-aumovio-bold text-[#ffd600] bg-[#ffee99]/20 border border-[#ffd600]/30 rounded-lg shadow-sm';
export const INFO_MESSAGE = 'font-aumovio-bold text-[#4827AF] bg-[#a08ae5]/15 border border-[#4827AF]/25 rounded-lg shadow-sm';

// ============================================================================
// MODERN STATUS INDICATORS - Applied Updated Validation Colors
// ============================================================================
export const STATUS_INDICATOR_ACTIVE = 'w-2.5 h-2.5 bg-[#32cb70] rounded-full flex-shrink-0 shadow-sm ring-2 ring-[#32cb70]/30 animate-pulse';
export const STATUS_INDICATOR_INACTIVE = 'w-2.5 h-2.5 bg-[#787878] rounded-full flex-shrink-0 shadow-sm';
export const STATUS_INDICATOR_WARNING = 'w-2.5 h-2.5 bg-[#ffee99]/20 rounded-full flex-shrink-0 shadow-sm ring-2 ring-[#ffd600]/30';
export const STATUS_INDICATOR_ERROR = 'w-2.5 h-2.5 bg-[#d82822] rounded-full flex-shrink-0 shadow-sm ring-2 ring-[#d82822]/30 animate-pulse';

// ============================================================================
// MATERIAL TYPE COLORS - Applied Updated Brand Guidelines (No Gradients)
// ============================================================================
export const MATERIAL_TYPE_COLORS = {
    RAW: STATUS_BG_COLORS.blue + ' ' + STATUS_TEXT_COLORS.blue + ' ' + STATUS_BORDER_COLORS.blue,
    SEMI: STATUS_BG_COLORS.warning + ' ' + STATUS_TEXT_COLORS.warning + ' ' + STATUS_BORDER_COLORS.warning,
    FIN: STATUS_BG_COLORS.green + ' ' + STATUS_TEXT_COLORS.green + ' ' + STATUS_BORDER_COLORS.green,
    PACK: STATUS_BG_COLORS.purple + ' ' + STATUS_TEXT_COLORS.purple + ' ' + STATUS_BORDER_COLORS.purple,
    TOOL: 'bg-[#787878] text-[#000000]/80 font-aumovio-bold border border-[#787878]/50 rounded-lg shadow-sm',
    CONS: 'bg-[#FFB7A1]/25 text-[#FF4208] font-aumovio-bold border border-[#FF4208]/30 rounded-lg shadow-sm',
    default: 'bg-[#f0f0f0] text-[#000000]/70 font-aumovio border border-[#787878]/40 rounded-lg shadow-sm',
};

// ============================================================================
// REPORT STATUS COLORS - Applied Updated Brand Guidelines (No Gradients)
// ============================================================================
export const REPORT_STATUS_COLORS = {
    MATCH: STATUS_BG_COLORS.green + ' text-[#32cb70] font-aumovio-bold border border-[#32cb70]/25 rounded-full shadow-sm',
    NO_SAP_DATA: 'bg-[#f0f0f0] text-[#000000]/80 font-aumovio border border-[#787878]/40 rounded-full shadow-sm',
    NOT_IN_ACTUAL: 'bg-[#FFB7A1]/25 text-[#FF4208] font-aumovio-bold border border-[#FF4208]/30 rounded-full shadow-sm',
    MINOR_EXCESS: STATUS_BG_COLORS.blue + ' text-[#18a9e7] font-aumovio-bold border border-[#18a9e7]/25 rounded-full shadow-sm',
    MINOR_SHORTAGE: STATUS_BG_COLORS.warning + ' text-[#ffd600] font-aumovio-bold border border-[#ffd600]/25 rounded-full shadow-sm',
    MAJOR_EXCESS: STATUS_BG_COLORS.purple + ' text-[#4827AF] font-aumovio-bold border border-[#4827AF]/30 rounded-full shadow-sm',
    MAJOR_SHORTAGE: STATUS_BG_COLORS.red + ' text-[#d82822] font-aumovio-bold border border-[#d82822]/25 rounded-full shadow-sm',
    default: 'bg-[#f0f0f0] text-[#000000]/85 font-aumovio border border-[#787878]/30 rounded-full shadow-sm',
};

// ============================================================================
// PREMIUM ALERT STYLES - Applied Updated Validation Colors (No Gradients)
// ============================================================================
export const ALERT_ERROR = 'bg-[#f0d3dc] border border-[#d82822]/30 text-[#d82822] px-6 py-2 rounded-lg shadow-lg backdrop-blur-sm';
export const ALERT_SUCCESS = 'bg-[#adebc6] border border-[#32cb70]/30 text-[#32cb70] px-6 py-2 rounded-lg shadow-lg backdrop-blur-sm';
export const ALERT_WARNING = 'bg-[#ffee99]/20 border border-[#ffd600]/30 text-[#ffd600] px-6 py-2 rounded-lg shadow-lg backdrop-blur-sm';
export const ALERT_INFO = 'bg-[#a08ae5]/15 border border-[#4827AF]/25 text-[#4827AF] px-6 py-2 rounded-lg shadow-lg backdrop-blur-sm';

// ============================================================================
// PREMIUM CARD STYLES - Applied Updated Brand Colors (No Gradients)
// ============================================================================
export const CARD_ERROR = 'bg-[#f0d3dc] p-6 rounded-lg shadow-xl border border-[#d82822]/20 backdrop-blur-sm';
export const CARD_SUCCESS = 'bg-[#adebc6] p-6 rounded-lg shadow-xl border border-[#32cb70]/20 backdrop-blur-sm';
export const CARD_WARNING = 'bg-[#ffee99]/20 p-6 rounded-lg shadow-xl border border-[#ffd600]/20 backdrop-blur-sm';
export const CARD_INFO = 'bg-[#a08ae5]/15 p-6 rounded-lg shadow-xl border border-[#4827AF]/20 backdrop-blur-sm';
export const CARD_PURPLE = 'bg-[#a08ae5]/25 p-6 rounded-lg shadow-xl border border-[#4827AF]/25 backdrop-blur-sm';

/**
 * @description Recovery email not set
 */
export function EMAIL_NOT_SET(email_type = '') {
    return (
        <div className={`px-5 py-2 pl-4 flex flex-row justify-start rounded-lg cursor-default text-white bg-[#ffee99]/20`}>
            <FontAwesomeIcon className={`${ICON_PLACE_SELF_CENTER}`} icon={faWarning} />
            {email_type} email not set up yet for this account.
        </div>
    );
}
