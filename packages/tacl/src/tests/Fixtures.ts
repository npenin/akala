import { AclManager, MemoryProvider, RouterProvider, Deny, Allow, IAclProvider } from "../index.js";
import assert from 'assert';

describe('general', function ()
{

    it('should work', function ()
    {
        // var categories: IAclProvider = new MemoryProvider();
        const widgets: IAclProvider = new MemoryProvider();
        const urls: IAclProvider = new MemoryProvider();

        widgets.SetAcls(
            new Deny("/", "read", "*"),
            new Allow("/", "read", "g1")
        );
        urls.SetAcls(
            new Allow("/c", "read", "g2"),
            new Deny("/c", "read", "g3"),
            new Allow("/d", "read", "g3"),
            new Deny("/d", "read", "*"),
            new Deny("/", "read", "g2")
        );

        const router = new RouterProvider();
        router.Register("/a", widgets);
        router.Register("/a/b", urls);
        const aclManager = new AclManager();
        aclManager.defaultProvider = router;

        assert.strictEqual(5, router.GetAcls("/a/b/c", "read").length);
        assert.strictEqual(5, router.GetAcls("/a/b/d", "read").length);

        assert.ok(aclManager.isAllowed("/a/b/c", "read", "g1", "g2"));
        assert.ok(!aclManager.isAllowed("/a/b/c", "read", "g1", "g3"));
        assert.ok(aclManager.isAllowed("/a/b/d", "read", "g3"));

        assert.ok(aclManager.isAllowed("/a/b/d", "read", "g1", "g3"));
        assert.ok(!aclManager.isAllowed("/a/b/d", "read", "g1", "g2"));
        assert.ok(!aclManager.isAllowed("/a/b/c", "read", "g3"));
    });

    it('ShouldWorkWithRootRegisteredOnRouter', function ()
    {
        // const categories = new MemoryProvider();
        const widgets = new MemoryProvider();
        const urls = new MemoryProvider();

        widgets.SetAcls(
            new Deny("/", "read", "*"),
            new Allow("/", "read", "g1")
        );
        urls.SetAcls(
            new Allow("/c", "read", "g2"),
            new Deny("/c", "read", "g3"),
            new Allow("/d", "read", "g3"),
            new Deny("/d", "read", "*"),
            new Deny("/", "read", "g2")
        );

        const router = new RouterProvider();
        router.Register("/", widgets);
        router.Register("/b", urls);
        const aclManager = new AclManager();
        aclManager.defaultProvider = router;

        assert.strictEqual(5, router.GetAcls("/b/c", "read").length);
        assert.strictEqual(5, router.GetAcls("/b/d", "read").length);

        assert.ok(aclManager.isAllowed("/b/c", "read", "g1", "g2"));
        assert.ok(!aclManager.isAllowed("/b/c", "read", "g1", "g3"));
        assert.ok(aclManager.isAllowed("/b/d", "read", "g3"));

        assert.ok(aclManager.isAllowed("/b/d", "read", "g1", "g3"));
        assert.ok(!aclManager.isAllowed("/b/d", "read", "g1", "g2"));
        assert.ok(!aclManager.isAllowed("/b/c", "read", "g3"));
    });

    it('ShouldDenyEveryoneWhenNoRule', function ()
    {
        const aclManager = new AclManager();
        aclManager.defaultProvider = new MemoryProvider();
        assert.ok(!aclManager.isAllowed("/", "read"));
        assert.ok(!aclManager.isAllowed("/", "read", "s.ros"));
    });

    it('ShouldDenyNotAuthorized', function ()
    {
        const aclManager = new AclManager();
        aclManager.defaultProvider = new MemoryProvider();

        aclManager.allow("/travel", "read", "s.ros");

        ShouldDenyNotAuthorizedByConfiguration(aclManager);
    });

    it('Bug', function ()
    {
        const aclManager = new AclManager();
        aclManager.defaultProvider = new MemoryProvider();
        aclManager.allow("/", "read", "*");
        aclManager.deny("/travel", "read", "s.ros");

        assert.ok(!aclManager.isAllowed("/travel", "read", "s.ros"));
        assert.ok(!aclManager.isAllowed("/travel/asshole", "read", "s.ros"));
        assert.ok(aclManager.isAllowed("/", "read", "s.ros"));
        assert.ok(aclManager.isAllowed("/", "read", "peter"));
        assert.ok(aclManager.isAllowed("/travel", "read", "peter"));
        assert.ok(aclManager.isAllowed("/travel/asshole", "read", "peter"));
    });

    function ShouldDenyNotAuthorizedByConfiguration(aclManager: AclManager)
    {
        assert.ok(aclManager.isAllowed("/travel", "read", "s.ros"));
        assert.ok(aclManager.isAllowed("/travel/asshole", "read", "s.ros"));
        assert.ok(!aclManager.isAllowed("/", "read", "s.ros"));
        assert.ok(!aclManager.isAllowed("/", "read", "peter"));
        assert.ok(!aclManager.isAllowed("/travel", "read", "peter"));
        assert.ok(!aclManager.isAllowed("/travel/asshole", "read", "peter"));
    }

    it('ShouldHandleStarVerb', function ()
    {
        const router = new RouterProvider();
        const aclManager = new AclManager();
        aclManager.defaultProvider = router;
        const urls = new MemoryProvider();
        router.Register("/Widget/Rss/Urls", urls);
        const actions = new MemoryProvider();
        router.Register("/Widget", actions);
        aclManager.allow("/Widget", "*", "*");
        aclManager.deny("/Widget/Rss/Urls", "access", "~/Widgets/ClientRss/ClientRssWidget.ascx");
        aclManager.allow("/Widget/Rss/Urls/fr/happly", "Access", "~/Widgets/ClientRss/ClientRssWidget.ascx");
        aclManager.deny("/Widget/Rss/Urls/fr/happly/knowledgebank", "access", "~/Widgets/ClientRss/ClientRssWidget.ascx");

        assert.ok(!aclManager.isAllowed("/Widget/Rss/Urls", "access", "~/Widgets/ClientRss/ClientRssWidget.ascx"));
        assert.ok(!aclManager.isAllowed("/Widget/Rss/Urls/fr/happly/knowledgebank", "access", "~/Widgets/ClientRss/ClientRssWidget.ascx"));
        assert.ok(aclManager.isAllowed("/Widget/Rss/Urls/fr/happly/knoledgebank", "access", "~/Widgets/ClientRss/ClientRssWidget.ascx"));
        assert.ok(aclManager.isAllowed("/Widget", "read", "~/Widgets/ClientRss/ClientRssWidget.ascx"));
        assert.ok(aclManager.isAllowed("/Widget/Rss/Urls/fr/happly/knowledgebank", "read", "~/Widgets/ClientRss/ClientRssWidget.ascx"));
    })

    it('ShouldNotifyOnAclRuleChange', function ()
    {
        const router = new RouterProvider();
        const aclManager = new AclManager();
        aclManager.defaultProvider = router;
        router.Register("/travel", new MemoryProvider());
        aclManager.RegisterForRuleChange("/travel", s => console.log(`'${s}' has changed`));
        aclManager.AclChanged.add(s => console.log(`* '${s}' has changed`));
        aclManager.allow("/", "read", "*");
        aclManager.deny("/travel", "read", "s.ros");
        aclManager.deny("/travel/asshole", "read", "s.ros");
    })
});