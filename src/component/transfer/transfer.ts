import {
    Component,
    Input,
    Output,
    EventEmitter,
    OnInit,
    AfterViewInit,
    ViewEncapsulation,
    ChangeDetectionStrategy
} from '@angular/core';

import { TreeNode, TreeNodeParent } from './transfer-interface';

import { deepClone } from '../util/clone';

/** default candidate list types */
export type CANDIDATE_TYPE = 'tree' | 'table';

/** default selected list types */
export type SELECTED_TYPE = 'tree' | 'path';

@Component({
    selector: 'nb-transfer',
    templateUrl: './transfer.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    preserveWhitespaces: false,
    host: {
        'class': 'nb-widget nb-transfer'
    },
    exportAs: 'nbTransfer'
})
export class TransferComponent implements OnInit, AfterViewInit {
    
    /** candidate list data */
    @Input() candidateData: TreeNode[] = [];
    /** selected list data */
    @Input() selectedData: TreeNode[] = [];

    /** candidate list type, default：‘tree’ */
    @Input() candidateType: CANDIDATE_TYPE = 'tree';
    /** selected list type, default：‘tree’ */
    @Input() selectedType: SELECTED_TYPE = 'tree';

    /** Whether the transfer is disabled */
    @Input() disabled: boolean = false;

    /** get selected value event */
    @Output() getValue: EventEmitter<number[] | string[]> = new EventEmitter<number[] | string[]>();

    /**
     * original candidate data
     * @docs-private
     */
    private originalCandidateData: TreeNode[] = [];
    /**
     * original selected data
     * @docs-private
     */
    private originalselectedData: TreeNode[] = [];

    /**
     * all options count
     * @docs-private
     */
    private candidateCount: number = 0;
    /**
     * all selected options count
     * @docs-private
     */
    private selectedCount: number = 0;

    /**
     * candidate trans to list data
     * @docs-private
     */
    private _candidateNodeList: TreeNode[] = [];
    /**
     * selected trans to list data
     * @docs-private
     */
    private _selectedNodeList: TreeNode[] = [];

    /**
     * candidate searched data as list
     * @docs-private
     */
    private _candidateSearchNodeList: TreeNode[] = [];
    /**
     * selected searched data as list
     * @docs-private
     */
    private _selectedSearchNodeList: TreeNode[] = [];

    /**
     * selected options's id as list
     * @docs-private
     */
    private dataListSelected: Array<string> = [];

    constructor() { }

    ngOnInit() {
        this.initTree(this.candidateData, 'candidate');
        this.initTree(this.selectedData, 'selected');
        this.countOptsStateValue(this.candidateData);
        this.getSelectedData(this.candidateData);

        this.originalCandidateData = deepClone(this.candidateData);
        this.originalselectedData = deepClone(this.selectedData);
        this.transferTreeToList(this.originalCandidateData, 'candidate');
        this.transferTreeToList(this.originalselectedData, 'selected');
    }

    ngAfterViewInit() {
        this.getValue.emit(this.dataListSelected);
    }

    /** set the show attribute to true */
    initTree(treeData: TreeNode[], mode: string) {
        if (treeData.length) {
            treeData.forEach((node: TreeNode) => {
                node.show = mode === 'candidate' ? true : node.isSelected;
                node.isExpanded = mode === 'candidate' ? false : node.isSelected;
                if (node.children && node.children.length) {
                    this.initTree(node.children, mode);
                }
            });
        }
    }

    /** set the show attribute to false, for fitler */
    transferTreeToList(treeData: TreeNode[], mode: string) {
        if (treeData.length) {
            treeData.forEach((node: TreeNode) => {
                node.show = false;
                if (mode === 'candidate') {
                    this._candidateNodeList.push(node);
                }
                if (mode === 'selected') {
                    this._selectedNodeList.push(node);
                }
                if (node.children && node.children.length) {
                    this.transferTreeToList(node.children, mode);
                }
            });
        }
    }

    /** init count */
    initCount() {
        this.candidateCount = 0;
        this.selectedCount = 0;
    }

    /** calculate selected options count */
    countOptsStateValue(tree: TreeNode[]) {
        if (tree.length) {
            tree.forEach((node: TreeNode) => {
                if (node.isSelected && node.selectable && this.hasChildren(node)) {
                    this.selectedCount++;
                }
                if (node.selectable && this.hasChildren(node)) {
                    this.candidateCount++;
                }
                if (node.children && node.children.length) {
                    this.countOptsStateValue(node.children);
                }
            });
        }
    }

    /** clear selected options's id as list */
    clearDataListSelected() {
        this.dataListSelected = [];
    }

    /** get selected options's id as list */
    getSelectedData(tree: TreeNode[]) {
        if (tree.length) {
            tree.forEach((node: TreeNode) => {
                if (node.selectable && node.isSelected && this.hasChildren(node)) {
                    this.dataListSelected.push(node.id);
                }
                if (node.children && node.children.length) {
                    this.getSelectedData(node.children);
                }
            });
        }
    }

    /** judge node whether have child */
    hasChildren(node: TreeNode) {
        if (!node.children) {
            return true;
        }
        if (node.children && node.children.length === 0) {
            return true;
        }
        return false;
    }

    /** clear search results */
    clearSearch(event: string, mode: string) {
        this.searchByKeyWord(event, mode);
    }

    /** fitler candidate or selected list by key word */
    searchByKeyWord(event: string, mode: string) {

        /**
         * when the keyword is null, show the all list data
         * @docs-private
         */
        if (!event) {
            if (mode === 'candidate') {
                this.initTree(this.originalCandidateData, 'candidate');
                this.candidateData = this.originalCandidateData;
                this.initCount();
                this.countOptsStateValue(this.candidateData);
                return;
            }

            if (mode === 'selected') {
                this.initTree(this.originalselectedData, 'selected');
                this.selectedData = this.originalselectedData;
                return;
            }
        }

        this.resetNodeList(mode);

        if (mode === 'candidate') {
            this._candidateSearchNodeList = [];
            for (let node of this._candidateNodeList) {
                if (node.name && node.name.search(event) !== -1) {
                    this.searchNodes(node, mode);
                }
            }
            this.candidateData = this.resetTreeData(mode);
        }
        if (mode === 'selected') {
            this._selectedSearchNodeList = [];
            for (let node of this._selectedNodeList) {
                if (node.name && node.name.search(event) !== -1 && node.isSelected) {
                    this.searchNodes(node, mode);
                }
            }
            this.selectedData = this.resetTreeData(mode);
        }
    }

    /** reset candidate or selected node list */
    resetNodeList(mode: string) {
        if (mode === 'candidate') {
            this._candidateNodeList = [];
        }
        if (mode === 'selected') {
            this._selectedNodeList = [];
        }
        let treeData = mode === 'candidate' ? this.candidateData : this.selectedData;
        this.transferTreeToList(treeData, mode);
    }

    /** reset candidate or selected list data */
    resetTreeData(mode: string) {
        let rootNodes: TreeNode[] = [];
        let nodeListSearched = mode === 'candidate' ? this._candidateSearchNodeList : this._selectedSearchNodeList;
        rootNodes = this.getRootNodes(nodeListSearched);
        for (let root of rootNodes) {
            for (let node of nodeListSearched) {
                this.renderSearchNodes(root, node, mode);
            }
        }
        return rootNodes;
    }

    /** get node the searched by key word  */
    searchNodes(node: TreeNode, mode: string) {
        this.setSearchNodes(node, mode);
        if (node.parent) {
            let nodeParent: TreeNode | undefined;
            nodeParent = this.getParentNode(node.parent, mode);
            if (nodeParent) {
                if (nodeParent.parent) {
                    this.searchNodes(nodeParent, mode);
                } else {
                    this.setSearchNodes(nodeParent, mode);
                }
            }
        }
    }

    /** get node's parent node  */
    getParentNode(parent: TreeNodeParent, mode): TreeNode | undefined {
        let parentNode: TreeNode | undefined;
        let nodeList = mode === 'candidate' ? this._candidateNodeList : this._selectedNodeList;
        parentNode =  nodeList.find((node: TreeNode) => {
            return parent.id === node.id;
        });
        return parentNode;
    }

    /** push filtered by word word node into xxSearchNodeList */
    setSearchNodes(node: TreeNode, mode) {
        if (mode === 'candidate') {
            if (!this.isExistRepetition(node, mode)) {
                this._candidateSearchNodeList.push(node);
            }
        }
        if (mode === 'selected') {
            if (!this.isExistRepetition(node, mode) && node.isSelected) {
                this._selectedSearchNodeList.push(node);
            }
        }
    }
    
    /** judge node whether have in xxSearchNodeList */
    isExistRepetition(targetNode: TreeNode, mode) {
        let nodeListSearched = mode === 'candidate' ? this._candidateSearchNodeList : this._selectedSearchNodeList;
        if (nodeListSearched.length === 0) {
            return false;
        } else {
            let nodeFinded: TreeNode | undefined;
            nodeFinded = nodeListSearched.find((node: TreeNode) => {
                return targetNode.id === node.id;
            });
            return nodeFinded ? true : false;
        }
    }

    /** get target node root node */
    getRootNodes(nodes: TreeNode[]) {
        return nodes.filter((node: TreeNode) => {
            return !node.parent;
        });
    }

    /** render searched nodes */
    renderSearchNodes(root: TreeNode, node: TreeNode, mode: string) {
        if (root.id === node.id) {
            this.renderNode(root, mode);
        }
        if (root.children && root.children.length) {
            for (let child of root.children) {
                if (node.id === child.id) {
                    this.renderNode(child, mode);
                } else {
                    this.renderSearchNodes(child, node, mode);
                }
            }
        }
    }

    /** render searched node */
    renderNode(node: TreeNode, mode: string) {
        node.isExpanded = true;
        if (mode === 'candidate') {
            node.show = true;
        }
        if (mode === 'selected' && node.isSelected) {
            node.show = true;
        }
    }

    /** throw the node click event out */
    transNode(event: TreeNode, mode: string) {
        let data = mode === 'selected' ? this.selectedData : this.candidateData;
        let chkVal = mode === 'selected' ? true : false;
        this._selectedNodeList = [];
        this._candidateNodeList = [];
        this.transferTreeToList(data, mode);

        let targetNode: TreeNode | undefined = this.getTargetNode(event, mode);
        if (targetNode) {
            this.propagateDown(targetNode, chkVal);
            this.propagateUp(targetNode, chkVal, mode);
        }

        let rootNodes: TreeNode[] = this.renderTargetNode(mode);
        if (mode === 'candidate') {
            this.candidateData = rootNodes;
        } else {
            this.selectedData = rootNodes;
        }
        this.initCount();
        this.countOptsStateValue(this.candidateData);
        this.clearDataListSelected();
        this.getSelectedData(this.candidateData);
        this.getValue.emit(this.dataListSelected);
    }

    /** get target node in xxNodeList */
    getTargetNode(compareNode: TreeNode, mode: string): TreeNode | undefined {
        let targetNode: TreeNode | undefined;
        let nodeList = mode === 'candidate' ? this._candidateNodeList : this._selectedNodeList;
        targetNode = nodeList.find((node: TreeNode) => {
            return compareNode.id === node.id;
        });
        return targetNode;
    }

    /** propagate down node 'isSelected' value */
    propagateDown(node: TreeNode, chkVal: boolean) {
        if (node.selectable || (node.children && node.children.length)) {
            node.isSelected = chkVal;
        }
        if (node.children && node.children.length) {
            for (let child of node.children) {
                this.propagateDown(child, chkVal);
            }
        }
    }

    /** propagate up node 'isSelected' value */
    propagateUp(node: TreeNode, chkVal: boolean, mode: string) {
        node.isSelected = chkVal;
        let nodeParent: TreeNode | undefined;
        if (node.parent) {
            nodeParent = this.getParentNode(node.parent, mode);
            if (nodeParent) {
                if (nodeParent.parent) {
                    this.propagateUp(nodeParent, chkVal, mode);
                } else {
                    nodeParent.isSelected = chkVal;
                }
            }
        }
    }

    /** render target node 'isExpanded' and 'isSelected' attribute */
    renderTargetNode(mode: string) {
        let nodeList = mode === 'candidate' ? this._candidateNodeList : this._selectedNodeList;
        let rootNodes: TreeNode[] = [];
        rootNodes = this.getRootNodes(nodeList);
        for (let root of rootNodes) {
            this.renderTransTree(root, mode);
        }
        return rootNodes;
    }

    /** render target's root node and root's children the 'isExpanded' and 'isSelected' attribute */
    renderTransTree(root: TreeNode, mode: string) {
        root.show = mode === 'candidate' ? true : root.isSelected;
        if(mode === 'selected') {
            root.isExpanded = root.isSelected;
        };
        if (root.children && root.children.length) {
            for (let child of root.children) {
                this.renderTransTree(child, mode);
            }
        }
    }

    /** trans all options to Selected or not */
    transAll(mode: string, chkVal: boolean) {
        if (this.disabled) {
            return;
        }
        // 当是‘candidate’mode，并且没有任何选中，禁止再次执行取消全部选中的操作过程
        if (mode === 'candidate' && this.selectedCount === 0) {
            return;
        }
        // 当是‘selected’mode，并且已经全部选中，禁止再次执行全部选中过程
        if (mode === 'selected' && this.selectedCount === this.candidateCount) {
            return;
        }
        
        let rootCandidateNodes: TreeNode[] = [];
        rootCandidateNodes = this.renderRootNodes(this.candidateData, mode, chkVal);
        this.candidateData = rootCandidateNodes;

        let rootSelectedNodes: TreeNode[] = [];
        rootSelectedNodes = this.renderRootNodes(this.selectedData, mode, chkVal);
        this.selectedData = rootSelectedNodes;

        this.initCount();
        this.countOptsStateValue(this.candidateData);
        this.clearDataListSelected();
        this.getSelectedData(this.candidateData);
        this.getValue.emit(this.dataListSelected);
    }

    /** render root nodes and root's children the 'isExpanded' and 'isSelected' attribute */
    renderRootNodes(treeData: TreeNode[], mode: string, chkVal: boolean) {
        let rootNodes: TreeNode[] = this.getRootNodes(treeData);
        for (let root of rootNodes) {
            this.propagateDown(root, chkVal);
            this.renderTransTree(root, mode);
        }
        return rootNodes;
    }
}
