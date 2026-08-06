'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Clock,
  Users,
  Bell,
  Activity,
  Server,
  User,
  UserPlus,
  MapPin,
  Heart,
  Star,
  LogIn,
  UserCheck,
  Shield,
  Ban,
  Upload,
  Download,
  Store,
  Package,
  CreditCard,
  Wallet,
  Award,
  Settings,
  BarChart,
  Box,
  Plus,
  GitBranch,
  FolderTree,
  Tag,
  Sliders,
  ListChecks,
  Warehouse,
  ArrowUpDown,
  AlertTriangle,
  AlertCircle,
  MessageSquare,
  Image,
  FileUp,
  FileDown,
  FileText,
  Layers,
  Folder,
  Filter,
  ClipboardList,
  Clock as ClockIcon,
  CheckCircle,
  Loader,
  PackageOpen,
  Truck,
  MapPin as MapPinIcon,
  CheckSquare,
  XCircle,
  RotateCcw,
  Undo2,
  Archive,
  Calendar,
  Banknote,
  History,
  Hourglass,
  Check,
  X,
  Coins,
  Landmark,
  Globe,
  RefreshCw,
  Settings as SettingsIcon,
  FileBarChart,
  FileSpreadsheet,
  FileText as FileTextIcon,
  MessageCircle,
  Mail,
  Ticket,
  Phone,
  ArrowLeftRight,
  HelpCircle,
  ThumbsUp,
  Megaphone,
  TicketPercent,
  Gift,
  Zap,
  Percent,
  PackageCheck,
  BadgeDollarSign,
  Package as PackageIcon,
  Share2,
  Users as UsersIcon2,
  Send,
  Mail as MailIcon,
  Smartphone,
  TrendingUp as TrendingUpIcon,
  Layout,
  Image as ImageIcon,
  Sliders as SlidersIcon,
  Newspaper,
  Sparkles,
  TrendingUp as TrendingUpIcon2,
  Package as PackageIcon2,
  Info,
  HelpCircle as HelpCircleIcon,
  PenLine,
  Rss,
  File,
  FileLock,
  FileCheck,
  FileX,
  Search,
  Truck as TruckIcon,
  Route,
  Map,
  DollarSign as DollarSignIcon,
  Barcode,
  Printer,
  Package as PackageIcon3,
  Building,
  Briefcase,
  Banknote as BanknoteIcon,
  TrendingUp as TrendingUpIcon3,
  Cog,
  Globe as GlobeIcon,
  Languages,
  Clock as ClockIcon2,
  Coins as CoinsIcon,
  Mail as MailIcon2,
  Shield as ShieldIcon,
  Key,
  Database,
  Wrench,
  Crown,
  UserCog,
  Users as UsersIcon3,
  Headphones,
  PiggyBank,
  Warehouse as WarehouseIcon,
  Megaphone as MegaphoneIcon,
  UserRound,
  Clipboard,
  FileClock,
  Package as PackageIcon4,
  ClipboardList as ClipboardListIcon,
  CreditCard as CreditCardIcon,
  User as UserIcon2,
  Cog as CogIcon,
  Lock,
  Book,
  BookOpen,
  Shield as ShieldIcon2,
  Video,
  Info as InfoIcon,
  MessageCircle as MessageCircleIcon,
  Bug,
  Cpu,
  Bot,
  LineChart,
  UserSearch,
  MessageSquare as MessageSquareIcon,
  Brain,
  Sparkles as SparklesIcon,
  Smartphone as SmartphoneIcon,
  Bell as BellIcon,
  BarChart as BarChartIcon,
  Plug,
  Webhook,
  Share,
  Globe2,
  Send as SendIcon2,
  CreditCard as CreditCardIcon2,
  Truck as TruckIcon2,
  Menu,
  X as XIcon,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserCircle,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';

// ============================================================
//  MENU ITEMS INTERFACE
// ============================================================
interface MenuItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  children?: MenuItem[];
}

// ============================================================
//  MAIN MENU
// ============================================================
const menuItems: MenuItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/users', label: 'User Management', icon: Users },
  { href: '/sellers', label: 'Seller Management', icon: Store },
  { href: '/products', label: 'Product Management', icon: Box },
  { href: '/video-shop', label: 'Video Shop', icon: Video },
  { href: '/categories', label: 'Category Management', icon: FolderTree },
  { href: '/orders', label: 'Order Management', icon: ClipboardList },
  { href: '/payments', label: 'Payment Management', icon: Banknote },
  { href: '/reports', label: 'Reports & Analytics', icon: FileBarChart },
  { href: '/support', label: 'Support Center', icon: MessageCircle },
  { href: '/marketing', label: 'Marketing', icon: Megaphone },
  { href: '/content', label: 'Content Management', icon: Layout },
  { href: '/shipping', label: 'Shipping & Logistics', icon: TruckIcon },
  { href: '/couriers', label: 'Courier Management', icon: Package },
  { href: '/suppliers', label: 'Supplier Management', icon: Building },
  { href: '/system', label: 'System Management', icon: Cog },
  { href: '/roles', label: 'Roles & Permissions', icon: Crown },
  { href: '/audit', label: 'Audit & Security', icon: Clipboard },
  { href: '/ai', label: 'AI Intelligence', icon: Bot },
  { href: '/mobile', label: 'Mobile App', icon: SmartphoneIcon },
  { href: '/integrations', label: 'Integrations', icon: Plug },
];

// ============================================================
//  HELP CENTER SUB-MENU
// ============================================================
const helpCenterItems: MenuItem[] = [
  { href: '/help/documentation', label: 'Documentation', icon: Book },
  { href: '/help/user-guide', label: 'User Guide', icon: BookOpen },
  { href: '/help/api-docs', label: 'API Documentation', icon: ShieldIcon2 },
  { href: '/help/tutorials', label: 'Tutorials', icon: Video },
  { href: '/help/release-notes', label: 'Release Notes', icon: InfoIcon },
  { href: '/help/contact', label: 'Contact Support', icon: MessageCircleIcon },
  { href: '/help/report-bug', label: 'Report a Bug', icon: Bug },
  { href: '/help/version', label: 'System Version', icon: Cpu },
];

// ============================================================
//  BOTTOM MENU
// ============================================================
const bottomMenuItems: MenuItem[] = [
  { href: '/profile', label: 'Profile', icon: UserCircle },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
];

// ============================================================
//  SIDEBAR COMPONENT
// ============================================================
export function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // ============================================================
  //  CHECK MOBILE
  // ============================================================
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setCollapsed(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ============================================================
  //  CHECK ACTIVE ROUTE
  // ============================================================
  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const isHelpActive = () => pathname.startsWith('/help');

  // ============================================================
  //  GET INITIALS
  // ============================================================
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // ============================================================
  //  RENDER MENU ITEM
  // ============================================================
  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);

    return (
      <TooltipProvider key={item.href} delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200',
                active
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                collapsed && 'justify-center'
              )}
            >
              <Icon className={cn(
                'h-5 w-5 flex-shrink-0 transition-all duration-200',
                active ? 'scale-105' : 'group-hover:scale-105'
              )} />
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
              {item.badge && !collapsed && (
                <Badge className="ml-auto bg-red-500 text-white hover:bg-red-600">
                  {item.badge}
                </Badge>
              )}
              {item.badge && collapsed && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {item.badge}
                </span>
              )}
              {active && !collapsed && (
                <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary-foreground/20" />
              )}
            </Link>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right" className="ml-2">
              {item.label}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  };

  // ============================================================
  //  RENDER HELP CENTER
  // ============================================================
  const renderHelpCenter = () => {
    const helpActive = isHelpActive();

    if (collapsed) {
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/help/documentation"
                className={cn(
                  'flex items-center justify-center rounded-lg px-3 py-2.5 transition-all duration-200',
                  helpActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Book className="h-5 w-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="ml-2">
              Help Center
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <Collapsible
        open={helpOpen}
        onOpenChange={setHelpOpen}
        className="mt-4"
      >
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200',
              helpActive
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Book className="h-5 w-5 flex-shrink-0" />
            <span className="flex-1 text-left text-sm font-medium">Help Center</span>
            <ChevronRight
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                helpOpen && 'rotate-90'
              )}
            />
            {helpActive && (
              <Badge className="bg-primary-foreground/20 text-primary-foreground">
                Active
              </Badge>
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-1 ml-2 space-y-0.5 border-l-2 border-muted pl-3">
          {helpCenterItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200',
                  active
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  // ============================================================
  //  SIDEBAR CONTENT
  // ============================================================
  const sidebarContent = (
    <>
      {/* ===== LOGO ===== */}
      <div className={cn(
        'flex h-16 items-center border-b px-4',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {!collapsed ? (
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
              <span className="text-white font-bold text-sm">E</span>
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white" />
            </div>
            <div>
              <span className="font-bold text-lg">AdminPanel</span>
              <span className="block text-[10px] text-muted-foreground -mt-0.5">
                Super Admin • v3.0
              </span>
            </div>
          </Link>
        ) : (
          <Link href="/dashboard">
            <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
              <span className="text-white font-bold text-sm">E</span>
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white" />
            </div>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:flex h-8 w-8 rounded-lg hover:bg-accent"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8 rounded-lg hover:bg-accent"
            onClick={() => setMobileOpen(false)}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* ===== NAVIGATION ===== */}
      <ScrollArea className="flex-1">
        <nav className="px-3 py-4">
          <div className="space-y-0.5">
            {menuItems.map((item) => renderMenuItem(item))}
          </div>

          {/* ===== DIVIDER ===== */}
          {!collapsed && <div className="my-4 border-t" />}

          {/* ===== HELP CENTER ===== */}
          {renderHelpCenter()}
        </nav>
      </ScrollArea>

      {/* ===== BOTTOM ===== */}
      <div className="border-t px-3 py-3">
        <div className="space-y-0.5">
          {bottomMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  collapsed && 'justify-center'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* ===== USER PROFILE ===== */}
        <div className="mt-3 border-t pt-3">
          <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
            <div className="relative flex-shrink-0">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-2 ring-primary/10">
                <span className="text-primary font-medium text-sm">
                  {user?.name ? getInitials(user.name) : 'AD'}
                </span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || 'Admin'}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.role || 'Super Administrator'}
                </p>
              </div>
            )}
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                onClick={() => logout()}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
          {collapsed && (
            <div className="mt-3 flex justify-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                onClick={() => logout()}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );

  // ============================================================
  //  MOBILE RENDER
  // ============================================================
  if (isMobile) {
    return (
      <>
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="fixed left-4 top-4 z-50 lg:hidden h-9 w-9 rounded-lg shadow-lg bg-white"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Mobile Overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <div
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-72 bg-white shadow-2xl transition-transform duration-300 lg:hidden',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {sidebarContent}
        </div>
      </>
    );
  }

  // ============================================================
  //  DESKTOP RENDER
  // ============================================================
  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col bg-white border-r transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-72'
      )}
    >
      {sidebarContent}
    </aside>
  );
}