// Universal Subtitles, universalsubtitles.org
// 
// Copyright (C) 2010 Participatory Culture Foundation
// 
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see 
// http://www.gnu.org/licenses/agpl-3.0.html.

goog.provide('unisubs.translate.Dialog');

/**
 * @constructor
 * 
 */
unisubs.translate.Dialog = function(opener, serverModel, videoSource, subtitleState, standardSubState, reviewOrApprovalType) {
    unisubs.Dialog.call(this, videoSource);
    unisubs.SubTracker.getInstance().start(true);
    this.opener_ = opener;
    this.subtitleState_ = subtitleState;
    this.standardSubState_ = standardSubState;

    this.serverModel_ = serverModel;
    this.serverModel_.init();
    this.saved_ = false;
    this.rightPanelListener_ = new goog.events.EventHandler(this);
    this.reviewOrApprovalType_ = reviewOrApprovalType;
    // if this is a review approve dialog, we must fetch saved notes for this task if available
    // but we should only do it when the dialog laods the first time
    // (else as users move back and forward between panels we might
    // overwrite their notes). This is what this flag is for
    this.notesFectched_ = false;
    if ( !Boolean(this.reviewOrApprovalType_)){
       this.notesFectched_ = true; 
    }
};

goog.inherits(unisubs.translate.Dialog, unisubs.subtitle.Dialog);

unisubs.translate.Dialog.State_ = {
    TRANSLATE: 0,
    EDIT_METADATA: 1
};

unisubs.translate.Dialog.prototype.createDom = function() {
    unisubs.translate.Dialog.superClass_.createDom.call(this);
    this.setDraggable(false);
    this.showGuidelines_();
    this.enterState_(unisubs.translate.Dialog.State_.TRANSLATE);
};
unisubs.translate.Dialog.prototype.showGuidelines_ = function() {
    if (!unisubs.guidelines['translate']) var s = unisubs.subtitle.Dialog.State_;
    // the same dialog can be used in transcribing or review approval, which guidelines should we use?
    var guideline = this.reviewOrApprovalType_ ? this.getTeamGuidelineForReview() : unisubs.guidelines['translate'];

    if (!guideline) {
        return;
    } 
    var guidelinesPanel = new unisubs.GuidelinesPanel(guideline);
    this.showTemporaryPanel(guidelinesPanel);
    this.displayingGuidelines_ = true;

    var that = this;
    this.getHandler().listenOnce(guidelinesPanel, unisubs.GuidelinesPanel.CONTINUE, function(e) {
        goog.Timer.callOnce(function() {
            that.displayingGuidelines_ = false;
            that.hideTemporaryPanel();
        });
    });
};
unisubs.translate.Dialog.prototype.handleSaveAndExitKeyPress_ = function(e) {
    e.preventDefault();
    this.saveWork(false);
};
unisubs.translate.Dialog.prototype.handleDoneKeyPress_ = function(event) {
    event.preventDefault();
    if (this.state_ == unisubs.translate.Dialog.State_.EDIT_METADATA)
        this.saveWork(true);
    else
        this.enterState_(unisubs.translate.Dialog.State_.EDIT_METADATA);
};
unisubs.translate.Dialog.prototype.isWorkSaved = function() {
    return this.saved_ || !this.serverModel_.anySubtitlingWorkDone();
};
unisubs.translate.Dialog.prototype.enterDocument = function() {
    // this is where we listen to the dialog close button
    unisubs.subtitle.Dialog.superClass_.enterDocument.call(this);
    unisubs.Dialog.translationDialogOpen = true;

    if (this.reviewOrApprovalType_ && !this.notesFectched_){
        var func  = this.serverModel_.fetchReviewData ;
        var that = this;
        if (this.reviewOrApprovalType_ == unisubs.Dialog.REVIEW_OR_APPROVAL.APPROVAL){
            func = this.serverModel_.fetchApproveData;
        }
        
        // make sure we retain the correct scope
        func.call(this.serverModel_, unisubs.task_id, function(body) {
            that.onNotesFetched_(body);
        });
    }
};
unisubs.translate.Dialog.prototype.onNotesFetched_ = function(body) {
    if( this.currentSubtitlePanel_ && this.currentSubtitlePanel_.setNotesContent_){
        this.currentSubtitlePanel_.setNotesContent_(body);
    }
};
unisubs.translate.Dialog.prototype.saveWorkInternal = function(closeAfterSave) {
    if (goog.array.isEmpty(
        this.serverModel_.captionSet_.nonblankSubtitles())){
        // there are no subs here, close dialog or back to subtitling
        this.showEmptySubsDialog();
        return;
    }
    var that = this;
    this.getRightPanelInternal().showLoading(true);
    this.serverModel_.finish(
        function(serverMsg){
            unisubs.subtitle.OnSavedDialog.show(serverMsg, function(){
                that.onWorkSaved(closeAfterSave);
            });
        },
        function(opt_status) {
            if (that.finishFailDialog_)
                that.finishFailDialog_.failedAgain(opt_status);
            else
                that.finishFailDialog_ = unisubs.finishfaildialog.Dialog.show(
                    that.serverModel_.getCaptionSet(), opt_status,
                    goog.bind(that.saveWorkInternal, that, closeAfterSave));
        });
};
unisubs.translate.Dialog.prototype.showGuidelinesForState_ = function(state) {
    this.setState_(state);
};
unisubs.Dialog.prototype.setVisible = function(visible) {
    if (visible) {
        unisubs.Dialog.superClass_.setVisible.call(this, true);
        goog.dom.getDocumentScrollElement().scrollTop = 0;
    }
    else {
        if (this.isWorkSaved()) {
            this.hideDialogImpl_();
        }
        else {
            this.showSaveWorkDialog_();
        }
    }
};
unisubs.translate.Dialog.prototype.onWorkSaved = function() {
    if (this.finishFailDialog_) {
        this.finishFailDialog_.setVisible(false);
        this.finishFailDialog_ = null;
    }
    unisubs.widget.ResumeEditingRecord.clear();
    this.getRightPanelInternal().showLoading(false);
    this.saved_ = true;
    this.setVisible(false);
};
unisubs.translate.Dialog.prototype.disposeInternal = function() {
    unisubs.translate.Dialog.superClass_.disposeInternal.call(this);
    this.serverModel_.dispose();
};
unisubs.translate.Dialog.prototype.enterState_ = function(state) {
    this.showGuidelinesForState_(state);
};
unisubs.translate.Dialog.prototype.suspendKeyEvents_ = function(suspended) {
    this.keyEventsSuspended_ = suspended;
    if (this.currentSubtitlePanel_ && this.currentSubtitlePanel_.suspendKeyEvents)
        this.currentSubtitlePanel_.suspendKeyEvents(suspended);
};
unisubs.translate.Dialog.prototype.setState_ = function(state) {
    this.state_ = state;

    this.suspendKeyEvents_(false);

    var s = unisubs.translate.Dialog.State_;

    this.setExtraClass_();

    var nextSubPanel = this.makeCurrentStateSubtitlePanel_();
    var captionPanel = this.getCaptioningAreaInternal();
    captionPanel.removeChildren(true);
    captionPanel.addChild(nextSubPanel, true);

    var rightPanel = nextSubPanel.getRightPanel();
    this.setRightPanelInternal(rightPanel);

    this.getTimelinePanelInternal().removeChildren(true);

    if (this.currentSubtitlePanel_ && this.currentSubtitlePanel_.getNotesContent_){
       var currentNoteContent =  this.currentSubtitlePanel_.getNotesContent_();
       if (nextSubPanel  && nextSubPanel.setNotesContent_){
           nextSubPanel.setNotesContent_(currentNoteContent);
       }
    }
    
    this.disposeCurrentPanels_();
    this.currentSubtitlePanel_ = nextSubPanel;

    var et = unisubs.RightPanel.EventType;
    this.rightPanelListener_.
        listen(
            rightPanel, et.LEGENDKEY, this.handleLegendKeyPress_).
        listen(
            rightPanel, et.DONE, this.handleDoneKeyPress_).
        listen(
            rightPanel, et.SAVEANDEXIT, this.handleSaveAndExitKeyPress_).
        listen(
            rightPanel, et.GOTOSTEP, this.handleGoToStep_);
    var backButtonText = null;
    if (state == s.EDIT_METADATA ){
        backButtonText = "Back to Translation";
    }
    if (backButtonText){
        rightPanel.showBackLink(backButtonText);
        this.rightPanelListener_.listen(
            rightPanel, et.BACK, this.handleBackKeyPress_);

    }
    
    var videoPlayer = this.getVideoPlayerInternal();
    if (this.isInDocument()) {
        if (!videoPlayer.isPaused()){
            videoPlayer.pause();
        }
        if(videoPlayer.getPlayheadTime()){
            videoPlayer.setPlayheadTime(0);
            videoPlayer.pause();
        }
    }

    var that = this;
    this.getRightPanelInternal().showDownloadLink(
        function() {
            return that.makeJsonSubs();
        });
};
unisubs.translate.Dialog.prototype.makeCurrentStateSubtitlePanel_ = function() {
    var s = unisubs.translate.Dialog.State_;
    
    if (this.state_ == s.TRANSLATE){
        this.translationPanel_ =  new unisubs.translate.TranslationPanel(
            this.serverModel_.getCaptionSet(), this.standardSubState_, this, 
            this.reviewOrApprovalType_, this.serverModel_);
        return this.translationPanel_; 
    }
    else if (this.state_ == s.EDIT_METADATA)
        return new unisubs.editmetadata.Panel(
            this.serverModel_.getCaptionSet(),
            this.getVideoPlayerInternal(),
            this.serverModel_,
            this.captionManager_,
            this.standardSubState_ ,
            false,
            this.reviewOrApprovalType_,
            this);
};

/**
 * Tries translate subtitles with BingTranslator
 */
unisubs.translate.Dialog.prototype.translateViaBing = function(){
    //I don't know how better call this. I think it should be incapsulated in translationList_,
    //but have chain of function calls can confuse.
    this.translationPanel_.getTranslationList().translateViaBing(
        this.standardSubState_.LANGUAGE, this.subtitleState_.LANGUAGE);
};
unisubs.translate.Dialog.prototype.getStandardLanguage = function(){
    return this.standardSubState_.LANGUAGE;
};
unisubs.translate.Dialog.prototype.getSubtitleLanguage = function(){
    return this.subtitleState_.LANGUAGE;
};
unisubs.translate.Dialog.prototype.getServerModel = function(){
    return this.serverModel_;
};
unisubs.translate.Dialog.prototype.makeJsonSubs =  function (){
    return this.serverModel_.getCaptionSet().makeJsonSubs();
};
unisubs.translate.Dialog.prototype.forkAndClose = function() {
    var dialog = new unisubs.translate.ForkDialog(
        goog.bind(this.forkImpl_, this));
    dialog.setVisible(true);
};
unisubs.translate.Dialog.prototype.forkImpl_ = function() {
    this.subtitleState_.fork();
    this.serverModel_.fork(this.standardSubState_);
    this.hideToFork();
    this.opener_.openSubtitlingDialog(
        this.serverModel_,
        this.subtitleState_);
};
unisubs.translate.Dialog.prototype.disposeCurrentPanels_ = function() {
    if (this.currentSubtitlePanel_) {
        this.currentSubtitlePanel_.dispose();
        this.currentSubtitlePanel_ = null;
    }
    this.rightPanelListener_.removeAll();
    if (this.timelineSubtitleSet_) {
        this.timelineSubtitleSet_.dispose();
        this.timelineSubtitleSet_ = null;
    }
};
