type RouterLike = {
  push: (href: string) => void;
};

function isFullDocumentRedirect(href: string) {
  return /^https?:\/\//i.test(href) || href.startsWith('/host-transfer');
}

export function navigateClientRedirect(router: RouterLike, href: string) {
  if (isFullDocumentRedirect(href)) {
    window.location.assign(href);
    return;
  }

  router.push(href);
}
