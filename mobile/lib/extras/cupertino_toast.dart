import 'package:flutter/cupertino.dart';

const double _kTabBarHeight = 50.0; // CupertinoTabBar default
const double _kToastMargin  = 12.0; // gap you want above the bar

void showCupertinoToast(BuildContext context, String msg) {
  // Overlay that lives ABOVE the tab-bar
  final overlay = Navigator.of(context, rootNavigator: true).overlay!;

  // This context still has the real safe-area insets
  final media   = MediaQuery.of(overlay.context);
  final double bottomOffset =
      media.padding.bottom + _kTabBarHeight + _kToastMargin;

  late OverlayEntry entry;
  entry = OverlayEntry(
    builder: (_) => _CupertinoToast(
      msg: msg,
      bottomOffset: bottomOffset,
      onFadeOut: () => entry.remove(),
    ),
  );

  overlay.insert(entry);
}

class _CupertinoToast extends StatefulWidget {
  final String msg;
  final double bottomOffset;
  final VoidCallback onFadeOut;
  const _CupertinoToast({
    required this.msg,
    required this.bottomOffset,
    required this.onFadeOut,
  });
  @override
  State<_CupertinoToast> createState() => _CupertinoToastState();
}

class _CupertinoToastState extends State<_CupertinoToast>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 500),
    value: 1.0,
  );
  late final Animation<double> _fade =
  CurvedAnimation(parent: _ctrl, curve: Curves.easeOut);

  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 1700), _ctrl.reverse);
    _ctrl.addStatusListener(
          (s) => s == AnimationStatus.dismissed ? widget.onFadeOut() : null,
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Positioned(
      bottom: widget.bottomOffset,          // ← now based on real insets
      left: MediaQuery.of(context).size.width * 0.1,
      width: MediaQuery.of(context).size.width * 0.8,
      child: FadeTransition(
        opacity: _fade,
        child: CupertinoPopupSurface(
          isSurfacePainted: false,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
            decoration: BoxDecoration(
              color: const Color(0xCC1E1E1E),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              widget.msg,
              textAlign: TextAlign.center,
              style: const TextStyle(color: CupertinoColors.white),
            ),
          ),
        ),
      ),
    );
  }
}