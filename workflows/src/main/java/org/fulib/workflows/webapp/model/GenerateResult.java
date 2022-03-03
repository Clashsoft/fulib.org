package org.fulib.workflows.webapp.model;

import java.util.Map;

public class GenerateResult {
    private String board;
    private Map<Integer, String> pages;
    private Map<Integer, String> diagrams;
    private Map<Integer, String> fxmls;
    private String classDiagram;

    public String getBoard() {
        return board;
    }

    public void setBoard(String board) {
        this.board = board;
    }

    public Map<Integer, String> getPages() {
        return pages;
    }

    public void setPages(Map<Integer, String> pages) {
        this.pages = pages;
    }

    public Map<Integer, String> getDiagrams() {
        return diagrams;
    }

    public void setDiagrams(Map<Integer, String> diagrams) {
        this.diagrams = diagrams;
    }

    public Map<Integer, String> getFxmls() {
        return fxmls;
    }

    public void setFxmls(Map<Integer, String> fxmls) {
        this.fxmls = fxmls;
    }

    public String getClassDiagram() {
        return classDiagram;
    }

    public void setClassDiagram(String classDiagram) {
        this.classDiagram = classDiagram;
    }
}
