const Collision = (() => {
  const left   = s => s.x - s.w / 2;
  const right  = s => s.x + s.w / 2;
  const bottom = s => s.y - s.h / 2;
  const top    = s => s.y + s.h / 2;

  function check(a, b, dx, dy) {
    return right(a)  + dx > left(b)   &&
           left(a)   + dx < right(b)  &&
           top(a)    + dy > bottom(b) &&
           bottom(a) + dy < top(b);
  }

  function calculate(a, b, dx, dy) {
    return [check(a, b, dx, 0), check(a, b, 0, dy)];
  }

  function isCollide(a, b) {
    const [cx, cy] = calculate(a, b, 0, 0);
    return cx && cy;
  }

  return { check, calculate, isCollide };
})();