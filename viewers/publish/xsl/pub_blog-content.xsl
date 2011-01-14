<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
  <xsl:param name="hBase"/>

    <xsl:template match="/">
        <!-- use the following bit of code to include the stylesheet to display it in Heurist publishing wizard
            otherwise it will be ommited-->
        <!-- begin including code -->
        <xsl:comment>
            <!-- name (desc.) that will appear in dropdown list -->
            [name]Blog posts as list with content[/name]
            <!-- match the name of the stylesheet-->
            [output]pub_blog-content[/output]
        </xsl:comment>
        <!-- end including code -->

        <html>
            <head>

                <style type="text/css">
                    body {font-family:Verdana,Helvetica,Arial,sans-serif; font-size:11px; }
                    td { vertical-align: top; }
                    #displaycontent table td {
                    border:0px;
                    }
                </style>
            </head>
            <body>
                <xsl:attribute name="pub_id">
                <xsl:value-of select="/hml/@pub_id"/>
                </xsl:attribute>
                <table border="0" >

                    <xsl:apply-templates select="hml/records/record"/>

                </table>
            </body>
        </html>
    </xsl:template>

    <xsl:template name="print_consolidated_title">
     <xsl:value-of select="title"/>
    </xsl:template>

	<xsl:template name="print_woot">
		<xsl:copy-of select="woot"/>
	</xsl:template>

    <xsl:template match="record">

        <tr><td style="padding-bottom: 8px;">
                <xsl:if test="detail[@id='160']">

                    <b>
                        <xsl:choose>
                            <xsl:when test="url != ''">
                                <xsl:element name="a">
                                    <xsl:attribute name="href"><xsl:value-of select="url"/></xsl:attribute>
                                    <xsl:attribute name="target">_blank</xsl:attribute>
                                    <xsl:call-template name="print_consolidated_title"></xsl:call-template>
                                     </xsl:element>
                            </xsl:when>
                            <xsl:otherwise>
                                <xsl:call-template name="print_consolidated_title"></xsl:call-template>
                            </xsl:otherwise>
                        </xsl:choose>
                    </b>
                    <br></br>

                    <a style=" font-family:Verdana,Helvetica,Arial,sans-serif; font-size:10px;"  target="_new" href="{$hBase}records/view/viewRecord.php?bib_id={id}">[view details]</a>&#160;<a style=" font-family:Verdana,Helvetica,Arial,sans-serif; font-size:10px;"  target="_new"
                      href="{$hBase}records/edit/editRecord.html?bib_id={id}">[edit]</a>
                    <p>
                    <xsl:call-template name="print_woot"></xsl:call-template>
                    </p>

                </xsl:if>
                </td></tr>

    </xsl:template>
</xsl:stylesheet>
